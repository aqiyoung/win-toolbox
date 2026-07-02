/**
 * Preload 脚本 — 安全暴露主进程 API 给渲染进程
 *
 * 渲染进程通过 window.toolbox 调用
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  PluginManifest,
  FileInfo,
  Task,
  ProgressInfo,
} from '../shared/types';
import { IPC } from '../shared/types';

// ─── 类型声明(给渲染进程用) ────────────────

export interface ToolboxAPI {
  // 插件
  getPlugins(): Promise<PluginManifest[]>;
  getPlugin(id: string): Promise<PluginManifest | undefined>;

  // 任务
  startTask(params: {
    pluginId: string;
    inputs: FileInfo[];
    options: Record<string, unknown>;
  }): Promise<string>;
  cancelTask(taskId: string): Promise<void>;
  listTasks(): Promise<Task[]>;

  // 文件对话框
  selectFiles(): Promise<string | null>;
  selectFilesMultiple(): Promise<string[]>;
  selectDirectory(): Promise<string | null>;
  openFile(path: string): Promise<void>;
  openDir(path: string): Promise<void>;

  // 设置
  getSettings(): Promise<Record<string, unknown>>;
  setSettings(settings: Record<string, unknown>): Promise<void>;

  // 系统
  getAppVersion(): Promise<string>;

  // 事件监听
  onTaskProgress(handler: (data: { taskId: string; progress: ProgressInfo }) => void): () => void;
  onTaskCompleted(handler: (data: { taskId: string; files: string[] }) => void): () => void;
  onTaskFailed(handler: (data: { taskId: string; error: string }) => void): () => void;
}

// ─── 暴露 API ──────────────────────────────

const api: ToolboxAPI = {
  // 插件
  getPlugins: () => ipcRenderer.invoke(IPC.PLUGINS_LIST),
  getPlugin: (id: string) => ipcRenderer.invoke(IPC.PLUGINS_GET, id),

  // 任务
  startTask: (params) => ipcRenderer.invoke(IPC.TASK_START, params),
  cancelTask: (taskId: string) => ipcRenderer.invoke(IPC.TASK_CANCEL, taskId),
  listTasks: () => ipcRenderer.invoke(IPC.TASK_LIST),

  // 文件
  selectFiles: () => ipcRenderer.invoke(IPC.FILE_SELECT),
  selectFilesMultiple: () => ipcRenderer.invoke(IPC.FILE_SELECT_MULTIPLE),
  selectDirectory: () => ipcRenderer.invoke(IPC.DIR_SELECT),
  openFile: (path: string) => ipcRenderer.invoke(IPC.OPEN_FILE, path),
  openDir: (path: string) => ipcRenderer.invoke(IPC.OPEN_DIR, path),

  // 设置
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, settings),

  // 系统
  getAppVersion: () => ipcRenderer.invoke(IPC.APP_VERSION),

  // 事件
  onTaskProgress: (handler) => {
    const listener = (_: unknown, data: { taskId: string; progress: ProgressInfo }) =>
      handler(data);
    ipcRenderer.on(IPC.TASK_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC.TASK_PROGRESS, listener);
  },
  onTaskCompleted: (handler) => {
    const listener = (_: unknown, data: { taskId: string; files: string[] }) => handler(data);
    ipcRenderer.on(IPC.TASK_COMPLETED, listener);
    return () => ipcRenderer.removeListener(IPC.TASK_COMPLETED, listener);
  },
  onTaskFailed: (handler) => {
    const listener = (_: unknown, data: { taskId: string; error: string }) => handler(data);
    ipcRenderer.on(IPC.TASK_FAILED, listener);
    return () => ipcRenderer.removeListener(IPC.TASK_FAILED, listener);
  },
};

contextBridge.exposeInMainWorld('toolbox', api);

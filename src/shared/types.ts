/**
 * 主进程 ↔ 渲染进程共享的类型定义
 */

// ─── 插件系统 ──────────────────────────────

export type PluginCategory = 'document' | 'video' | 'image' | 'audio';

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  category: PluginCategory;
  inputFormats: string[];
  outputFormats: string[];
  author?: string;
  icon?: string;
  /** 插件可配置项的 JSON Schema */
  configSchema?: Record<string, unknown>;
  /** 是否需要在 Python 侧运行 */
  requiresPython?: boolean;
  /** 主入口文件（npm spec） */
  main?: string;
}

export interface Plugin extends PluginManifest {
  /** 校验输入文件是否满足条件 */
  validate(inputs: FileInfo[]): Promise<ValidationResult>;

  /** 执行转换 */
  convert(
    inputs: FileInfo[],
    options: Record<string, unknown>,
    onProgress: (progress: ProgressInfo) => void,
  ): Promise<ConvertResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ConvertResult {
  outputFiles: string[];
  warnings?: string[];
  stats?: Record<string, number | string>;
}

// ─── 文件信息 ──────────────────────────────

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  mimeType: string;
}

// ─── 进度与任务 ────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ProgressInfo {
  /** 0-100 */
  percent: number;
  /** 当前阶段描述 */
  stage: string;
  /** 可选细节 */
  detail?: string;
  /** 当前处理页码/文件索引 */
  current?: number;
  /** 总页数/总文件数 */
  total?: number;
}

export interface Task {
  id: string;
  pluginId: string;
  pluginName: string;
  inputs: FileInfo[];
  options: Record<string, unknown>;
  status: TaskStatus;
  progress: ProgressInfo;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  outputFiles?: string[];
  error?: string;
}

// ─── IPC 通道事件名 ────────────────────────

export const IPC: Record<string, string> = {
  // 插件
  PLUGINS_LIST: 'plugins:list',
  PLUGINS_GET: 'plugins:get',

  // 任务
  TASK_START: 'task:start',
  TASK_CANCEL: 'task:cancel',
  TASK_LIST: 'task:list',
  TASK_PROGRESS: 'task:progress',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',

  // 文件
  FILE_SELECT: 'file:select',
  FILE_SELECT_MULTIPLE: 'file:select-multiple',
  DIR_SELECT: 'dir:select',
  OPEN_FILE: 'file:open',
  OPEN_DIR: 'dir:open',

  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // 系统
  APP_VERSION: 'app:version',
};

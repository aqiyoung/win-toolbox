/**
 * Electron 主进程入口
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { IS_DEV, APP_NAME, IPC, DEFAULT_SETTINGS } from '@shared/constants';
import { PluginManager } from './plugin-manager';
import { TaskQueue } from './task-queue';
import { selectFiles, selectFilesMultiple, selectDirectory } from './utils/file';
import { getSettings, setSettings, SETTINGS_FILE } from './utils/settings';
import { ensureDirs } from './utils/ensure-dirs';

// 单实例锁定
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const pluginManager = new PluginManager();
const taskQueue = new TaskQueue();

// ─── 窗口创建 ────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    frame: false, // 自定义标题栏
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App 生命周期 ────────────────────────────

app.whenReady().then(async () => {
  await ensureDirs();
  await pluginManager.discover();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ─── IPC 注册 ────────────────────────────────

function registerIpcHandlers(): void {
  // 插件
  ipcMain.handle(IPC.PLUGINS_LIST, () => {
    return pluginManager.list();
  });

  ipcMain.handle(IPC.PLUGINS_GET, (_, id: string) => {
    return pluginManager.get(id);
  });

  // 任务
  ipcMain.handle(IPC.TASK_START, async (event, { pluginId, inputs, options }) => {
    const plugin = pluginManager.get(pluginId);
    if (!plugin) throw new Error(`插件不存在: ${pluginId}`);

    const taskId = await taskQueue.enqueue({
      plugin,
      inputs,
      options,
      onProgress: (progress) => {
        event.sender.send(IPC.TASK_PROGRESS, { taskId, progress });
      },
      onCompleted: (result) => {
        event.sender.send(IPC.TASK_COMPLETED, { taskId, result });
      },
      onError: (error) => {
        event.sender.send(IPC.TASK_FAILED, { taskId, error: error.message });
      },
    });

    return taskId;
  });

  ipcMain.handle(IPC.TASK_CANCEL, (_, taskId: string) => {
    taskQueue.cancel(taskId);
  });

  ipcMain.handle(IPC.TASK_LIST, () => {
    return taskQueue.list();
  });

  // 文件对话框
  ipcMain.handle(IPC.FILE_SELECT, () => selectFiles(mainWindow!));
  ipcMain.handle(IPC.FILE_SELECT_MULTIPLE, () => selectFilesMultiple(mainWindow!));
  ipcMain.handle(IPC.DIR_SELECT, () => selectDirectory(mainWindow!));
  ipcMain.handle(IPC.OPEN_FILE, (_, p: string) => shell.openPath(p));
  ipcMain.handle(IPC.OPEN_DIR, (_, p: string) => shell.showItemInFolder(p));

  // 设置
  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings());
  ipcMain.handle(IPC.SETTINGS_SET, (_, settings: Record<string, unknown>) =>
    setSettings({ ...DEFAULT_SETTINGS, ...settings }),
  );

  // 应用版本
  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion());
}

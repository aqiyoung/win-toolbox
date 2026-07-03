/**
 * 全局常量
 */

import { app } from 'electron';
import { join } from 'path';

/** 是否开发模式 */
export const IS_DEV = !app.isPackaged;

/** 应用名称 */
export const APP_NAME = 'Win Toolbox';

/** 应用版本 */
export const APP_VERSION = app.getVersion();

// ─── 路径常量 ────────────────────────────────

/** 用户数据目录 */
export const USER_DATA_DIR = app.getPath('userData');

/** 日志目录 */
export const LOG_DIR = join(USER_DATA_DIR, 'logs');

/** 临时文件目录 */
export const TEMP_DIR = join(USER_DATA_DIR, 'temp');

/** 历史任务数据库文件 */
export const HISTORY_DB_PATH = join(USER_DATA_DIR, 'history.json');

/** 内嵌资源基目录（打包后） */
export const RESOURCES_DIR = IS_DEV
  ? join(process.cwd(), 'resources')
  : join(process.resourcesPath);

/** FFmpeg 可执行文件路径 */
export const FFMPEG_PATH = IS_DEV
  ? join(RESOURCES_DIR, 'ffmpeg', 'ffmpeg.exe')
  : join(RESOURCES_DIR, 'resources', 'ffmpeg', 'ffmpeg.exe');

/** Python 运行时路径 */
export const PYTHON_DIR = IS_DEV
  ? join(process.cwd(), 'python-runtime')
  : join(process.resourcesPath, 'python-runtime');

/** Python 可执行文件路径 */
export const PYTHON_PATH = join(PYTHON_DIR, 'python.exe');

/** 插件目录
 * 开发模式: <project>/plugins/
 * 打包模式: <resources>/plugins/ (extraResources 解压位置)
 */
export const PLUGINS_DIR = IS_DEV
  ? join(process.cwd(), 'plugins')
  : join(process.resourcesPath, 'plugins');

// ─── 任务队列 ────────────────────────────────

/** 默认最大并发任务数 */
export const DEFAULT_MAX_CONCURRENT = 3;

/** 任务超时时间（毫秒），30分钟 */
export const TASK_TIMEOUT_MS = 30 * 60 * 1000;

// ─── 默认设置 ────────────────────────────────

export const DEFAULT_SETTINGS = {
  outputDir: app.getPath('documents'),
  maxConcurrent: DEFAULT_MAX_CONCURRENT,
  autoOpenOutput: true,
  language: 'zh-CN',
  theme: 'auto' as 'light' | 'dark' | 'auto',
};


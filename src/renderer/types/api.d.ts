/**
 * 渲染进程 window.toolbox 类型声明
 */

import type { ToolboxAPI } from '../../preload/index';

declare global {
  interface Window {
    toolbox: ToolboxAPI;
  }
}

export {};

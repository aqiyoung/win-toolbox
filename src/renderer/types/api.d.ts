/**
 * 渲染进程 window.toolbox 类型声明
 */

import type { ToolboxAPI } from '../../preload/index';

declare global {
  interface Window {
    toolbox: ToolboxAPI;
  }
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

export {};

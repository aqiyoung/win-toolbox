/**
 * 文件选择对话框工具
 */

import { dialog, BrowserWindow } from 'electron';

/** 单文件选择(返回路径或 null) */
export function selectFiles(win: BrowserWindow): string | null {
  const paths = dialog.showOpenDialogSync(win, {
    properties: ['openFile'],
    title: '选择文件',
  });
  return paths?.[0] ?? null;
}

/** 多文件选择 */
export function selectFilesMultiple(win: BrowserWindow): string[] {
  const paths = dialog.showOpenDialogSync(win, {
    properties: ['openFile', 'multiSelections'],
    title: '选择文件(可多选)',
  });
  return paths ?? [];
}

/** 选择输出目录 */
export function selectDirectory(win: BrowserWindow): string | null {
  const paths = dialog.showOpenDialogSync(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择输出目录',
  });
  return paths?.[0] ?? null;
}

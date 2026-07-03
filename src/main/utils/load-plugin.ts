/**
 * 根据 manifest.json 路径加载插件
 *
 * manifest.json 同目录下需有 index.js (Node 侧编排),
 * Python 脚本放在 python/ 子目录。
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { Plugin, PluginManifest, FileInfo, ProgressInfo, ConvertResult } from '@shared/types';
import { runPython } from './python-bridge';

/**
 * manifest.json 示例:
 * {
 *   "id": "doc-pdf-to-ppt",
 *   "name": "PDF → PPT",
 *   "description": "将 PDF 转换为可编辑的 PowerPoint 演示文稿",
 *   "version": "1.0.0",
 *   "category": "document",
 *   "inputFormats": ["pdf"],
 *   "outputFormats": ["pptx"],
 *   "requiresPython": true
 * }
 */

export async function loadPlugin(manifestPath: string): Promise<Plugin> {
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const manifest: PluginManifest = JSON.parse(raw);
  const baseDir = dirname(manifestPath);
  const indexPath = join(baseDir, 'index.js');

  // ★ 惰性加载：discover 阶段不 require index.js —— 这样某个插件的加载失败
  // 不会波及其他插件。require 延迟到实际 convert 时执行。
  // 同时把 plugin 目录加入 module.paths，让相对 require('jimp') 能找到根 node_modules。
  let cachedNodePlugin: any = null;

  function getNodePlugin() {
    if (cachedNodePlugin !== null) return cachedNodePlugin;
    try {
      // 让 require() 从项目根目录的 node_modules 也能解析
      const Module = require('module');
      const rootPaths = Module._nodeModulePaths(process.cwd());
      Module.globalPaths = [...new Set([...Module.globalPaths, ...rootPaths, process.cwd()])];
      cachedNodePlugin = require(indexPath);
    } catch (err) {
      cachedNodePlugin = false;
      console.warn(`[loadPlugin] ${manifest.id}: require 失败 (${indexPath}):`, err);
    }
    return cachedNodePlugin || null;
  }

  return {
    ...manifest,
    requiresPython: manifest.requiresPython ?? false,

    async validate(inputs: FileInfo[]) {
      const nodePlugin = getNodePlugin();
      if (nodePlugin?.validate) return nodePlugin.validate(inputs);

      const errors: string[] = [];
      for (const f of inputs) {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
        if (!manifest.inputFormats.includes(ext)) {
          errors.push(`不支持的输入格式: ${f.name}`);
        }
      }
      return { valid: errors.length === 0, errors };
    },

    async convert(
      inputs: FileInfo[],
      options: Record<string, unknown>,
      onProgress: (p: ProgressInfo) => void,
    ): Promise<ConvertResult> {
      if (manifest.requiresPython) {
        return runPython(baseDir, manifest.id, inputs, options, onProgress);
      }

      const nodePlugin = getNodePlugin();
      if (nodePlugin?.convert) {
        return nodePlugin.convert(inputs, options, onProgress);
      }

      throw new Error(`插件 ${manifest.id} 没有可用的转换实现`);
    },
  };
}

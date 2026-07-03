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

  // ★ 惰性加载：discover 阶段不 require index.js —— 只检查文件是否存在于 manifest。
  // require 延迟到实际 convert 时执行，这样带 native 模块 (sharp/fluent-ffmpeg) 的插件
   // 不会在 require() 时就崩溃整个 discover 过程。
  let cachedNodePlugin: any = null;

  function getNodePlugin() {
    if (cachedNodePlugin !== null) return cachedNodePlugin;
    try {
      cachedNodePlugin = require(indexPath);
    } catch (err) {
      cachedNodePlugin = false; // 标记失败,避免重复 require
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

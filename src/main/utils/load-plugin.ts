/**
 * 根据 manifest.json 路径加载插件
 *
 * manifest.json 同目录下需有 index.ts (Node 侧编排),
 * Python 脚本放在 python/ 子目录。
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { Plugin, PluginManifest, FileInfo, ProgressInfo, ConvertResult } from '../../shared/types';
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

  // 尝试编译加载 index.ts (开发模式用 require 或动态 import)
  // 生产模式加载 index.js
  const indexPath = join(baseDir, 'index.js');
  let pluginModule: { createManifest?: () => PluginManifest } = {};

  try {
    pluginModule = await import(indexPath);
  } catch {
    // 没有 index.js 就用 manifest 里的信息兜底
  }

  return {
    ...manifest,
    requiresPython: manifest.requiresPython ?? false,

    async validate(inputs: FileInfo[]) {
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

      // Node 侧插件走直接调用
      // TODO: 视频/图片等非 Python 插件
      throw new Error(`未注册的 ${manifest.id} Node 侧处理`);
    },
  };
}

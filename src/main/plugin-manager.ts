/**
 * Plugin Manager — 插件注册、发现、调度
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { PLUGINS_DIR } from '@shared/constants';
import type { Plugin, PluginManifest } from '@shared/types';
import { loadPlugin } from './utils/load-plugin';

export class PluginManager {
  private plugins = new Map<string, Plugin>();

  /** 扫描内置插件目录，加载所有插件 */
  async discover(): Promise<void> {
    try {
      const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
      const categories = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      for (const category of categories) {
        const categoryDir = join(PLUGINS_DIR, category);
        const plugins = await fs.readdir(categoryDir, { withFileTypes: true });

        for (const p of plugins) {
          if (!p.isDirectory()) continue;
          const manifestPath = join(categoryDir, p.name, 'manifest.json');
          try {
            await fs.access(manifestPath);
            const plugin = await loadPlugin(manifestPath);
            this.register(plugin);
          } catch {
            // 静默跳过无 manifest 的目录
          }
        }
      }
    } catch (err) {
      console.error('[PluginManager] 扫描失败:', err);
    }
  }

  /** 注册一个插件 */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] 插件 ${plugin.id} 已存在, 将被覆盖`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /** 获取单个插件 */
  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /** 列出所有插件 */
  list(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      category: p.category,
      inputFormats: p.inputFormats,
      outputFormats: p.outputFormats,
      author: p.author,
      icon: p.icon,
      configSchema: p.configSchema,
    }));
  }

  /** 按分类列出 */
  listByCategory(category: string): PluginManifest[] {
    return this.list().filter((p) => p.category === category);
  }
}

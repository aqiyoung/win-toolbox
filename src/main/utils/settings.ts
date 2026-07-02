/**
 * 用户设置持久化
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { USER_DATA_DIR } from '@shared/constants';
import { DEFAULT_SETTINGS } from '@shared/constants';

export const SETTINGS_FILE = join(USER_DATA_DIR, 'settings.json');

let cache: Record<string, unknown> | null = null;

export async function getSettings(): Promise<Record<string, unknown>> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    cache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}

export async function setSettings(settings: Record<string, unknown>): Promise<void> {
  cache = settings;
  await fs.mkdir(USER_DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

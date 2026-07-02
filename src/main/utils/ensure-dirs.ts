/**
 * 启动时确保必要的目录存在
 */

import { promises as fs } from 'fs';
import { USER_DATA_DIR, LOG_DIR, TEMP_DIR } from '../../shared/constants';

export async function ensureDirs(): Promise<void> {
  await fs.mkdir(USER_DATA_DIR, { recursive: true });
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

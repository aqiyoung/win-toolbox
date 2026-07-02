/**
 * Python Bridge — 调用 Python 子进程执行插件脚本
 *
 * 协议:
 *   1. 启动 python <script> --mode json
 *   2. 通过 stdin 传入输入参数 (JSON)
 *   3. 从 stdout 读取进度和结果 (每行一个 JSON 对象)
 *      - {"type": "progress", "percent": 50, "stage": "...", ...}
 *      - {"type": "result", "outputFiles": [...], ...}
 *      - {"type": "error", "message": "..."}
 */

import { spawn, ChildProcess } from 'child_process';
import { PYTHON_PATH } from '@shared/constants';
import type { FileInfo, ProgressInfo, ConvertResult } from '@shared/types';

interface ProgressMsg {
  type: 'progress';
  percent: number;
  stage: string;
  detail?: string;
  current?: number;
  total?: number;
}

interface ResultMsg {
  type: 'result';
  outputFiles: string[];
  warnings?: string[];
  stats?: Record<string, unknown>;
}

interface ErrorMsg {
  type: 'error';
  message: string;
}

type StdoutMsg = ProgressMsg | ResultMsg | ErrorMsg;

/**
 * 运行插件对应的 Python 脚本
 * @param pluginBaseDir 插件 manifest.json 所在目录
 * @param pluginId       插件 ID
 * @param inputs         输入文件列表
 * @param options        用户配置
 * @param onProgress     进度回调(由 Plugin.convert 传入)
 */
export function runPython(
  pluginBaseDir: string,
  pluginId: string,
  inputs: FileInfo[],
  options: Record<string, unknown>,
  onProgress: (p: ProgressInfo) => void,
): Promise<ConvertResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = pluginIdToPluginMain(pluginBaseDir);

    const args = ['--mode', 'json'];
    const proc: ChildProcess = spawn(PYTHON_PATH, [scriptPath, ...args], {
      cwd: pluginBaseDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCURSION: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: 'utf-8' },
    });

    // 发送输入参数到 stdin
    const payload = JSON.stringify({
      inputs: inputs.map((f) => f.path),
      options,
    });

    if (proc.stdin) {
      proc.stdin.write(payload);
      proc.stdin.end();
    }

    // 读取 stdout (逐行 JSON)
    let outputBuf = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      outputBuf += chunk.toString('utf-8');
      const lines = outputBuf.split('\n');
      outputBuf = lines.pop() ?? ''; // 保留最后一段不完整行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const msg = JSON.parse(trimmed) as StdoutMsg;
          handleMessage(msg, onProgress, resolve, reject);
        } catch {
          // 非 JSON 输出,忽略或打印
          console.debug('[Python stdout]', trimmed);
        }
      }
    });

    // stderr 收集错误信息
    let stderrBuf = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf-8');
    });

    // 进程退出
    proc.on('error', (err) => {
      reject(new Error(`Python 进程启动失败: ${err.message}`));
    });

    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        const stderr = stderrBuf.trim();
        reject(
          new Error(
            `Python 进程退出码 ${code}${stderr ? ':\n' + stderr : ''}`,
          ),
        );
      }
    });
  });
}

function handleMessage(
  msg: StdoutMsg,
  onProgress: (p: ProgressInfo) => void,
  resolve: (r: ConvertResult) => void,
  reject: (e: Error) => void,
): void {
  switch (msg.type) {
    case 'progress':
      onProgress({
        percent: msg.percent,
        stage: msg.stage,
        detail: msg.detail,
        current: msg.current,
        total: msg.total,
      });
      break;

    case 'result':
      resolve({
        outputFiles: msg.outputFiles,
        warnings: msg.warnings,
        stats: msg.stats as Record<string, number | string> | undefined,
      });
      break;

    case 'error':
      reject(new Error(msg.message));
      break;
  }
}

/**
 * 根据插件目录查找主 Python 脚本
 * 约定: python/main.py
 */
function pluginIdToPluginMain(baseDir: string): string {
  return baseDir.replace(/\\/g, '/').replace(/\/[^/]*$/, '') + '/python/main.py';
}

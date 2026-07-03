/**
 * Video Format Convert — FFmpeg based (pre-bundled binary)
 *
 * Uses the bundled FFmpeg from resources/ffmpeg/ffmpeg.exe
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Determine FFmpeg path based on packaged or dev mode
function ffmpegPath() {
  const base = require('electron').app.isPackaged
    ? path.join(process.resourcesPath, 'resources', 'ffmpeg', 'ffmpeg.exe')
    : path.join(process.cwd(), 'resources', 'ffmpeg', 'ffmpeg.exe');
  return base;
}

const VALID = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm4v'];

async function validate(inputs) {
  const errors = [];
  for (const f of inputs) {
    const ext = path.extname(f.name).slice(1).toLowerCase();
    if (!VALID.includes(ext)) errors.push(`不支持: ${f.name}`);
  }
  return { valid: errors.length === 0, errors };
}

function ffmpegProc(args, onProgress, totalDurationSec) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      // parse progress: time=00:01:23.45
      const m = stderr.match(/time=(\d+):(\d+):(\d+)\.(\d+)/g);
      if (m && totalDurationSec > 0) {
        const last = m[m.length - 1];
        const parts = last.match(/(\d+)/g);
        if (parts && parts.length >= 4) {
          const secs = +parts[0] * 3600 + +parts[1] * 60 + +parts[2] + +parts[3] / 100;
          const pct = Math.min(Math.round((secs / totalDurationSec) * 100), 99);
          onProgress({ percent: pct, stage: '转换中...', detail: last.replace('time=', '') });
        }
      }
    });

    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`FFmpeg exit=${code}: ${stderr.slice(-300)}`));
      } else {
        resolve();
      }
    });
  });
}

async function convert(inputs, options, onProgress) {
  const outputDir = options.outputDir || path.dirname(inputs[0].path);
  const format = options.format || 'mp4';
  const vBitrate = options.videoBitrate || '2000k';
  const aBitrate = options.audioBitrate || '128k';

  fs.mkdirSync(outputDir, { recursive: true });
  const outputFiles = [];
  const total = inputs.length;

  for (let i = 0; i < total; i++) {
    const inp = inputs[i];
    const outName = `${path.parse(inp.name).name}.${format}`;
    const outputPath = path.join(outputDir, outName);

    onProgress({ percent: Math.round((i / total) * 100), stage: `处理 ${i + 1}/${total}`, current: i + 1, total });

    let args;
    if (format === 'gif') {
      args = ['-i', inp.path, '-vf', 'fps=10,scale=480:-1', '-loop', '0', outputPath];
    } else if (format === 'mp4') {
      args = ['-i', inp.path, '-c:v', 'libx264', '-b:v', vBitrate, '-c:a', 'aac', '-b:a', aBitrate, '-movflags', '+faststart', '-y', outputPath];
    } else if (format === 'webm') {
      args = ['-i', inp.path, '-c:v', 'libvpx-vp9', '-b:v', vBitrate, '-c:a', 'libopus', '-b:a', aBitrate, '-y', outputPath];
    } else {
      // mkv, avi, mov — just copy or transcode to default
      args = ['-i', inp.path, '-b:v', vBitrate, '-b:a', aBitrate, '-y', outputPath];
    }

    await ffmpegProc(args, onProgress, 0); // TODO: probe duration

    outputFiles.push(outputPath);
    onProgress({ percent: Math.round(((i + 1) / total) * 100), stage: `完成 ${i + 1}/${total}`, current: i + 1, total });
  }

  return { outputFiles, warnings: [], stats: { converted: total } };
}

module.exports = { validate, convert, createManifest: () => require('./manifest.json') };

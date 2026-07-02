/**
 * 下载 python-build-standalone 并安装插件依赖
 *
 * 用法: node scripts/download-python.js
 */

const https = require('https');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PYTHON_VERSION = '3.11.9';
const RELEASE = '20240107';
const PYTHON_DIR = path.join(process.cwd(), 'python-runtime');
const PYTHON_EXE = path.join(PYTHON_DIR, 'python.exe');

// GitHub releases URL for python-build-standalone
const ARCHIVE = `cpython-${PYTHON_VERSION}+${RELEASE}-x86_64-pc-windows-msvc-shared-install_only.tar.gz`;
const URL = `https://github.com/indygreg/python-build-standalone/releases/download/${RELEASE}/${ARCHIVE}`;

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { 'User-Agent': 'win-toolbox-setup' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

async function main() {
  // 检查是否已存在
  if (fs.existsSync(PYTHON_EXE)) {
    console.log('Python runtime already exists:', PYTHON_EXE);
  } else {
    const tmp = path.join(require('os').tmpdir(), 'wintoolbox-python.tar.gz');
    await download(URL, tmp);

    // 解压 (tar 在 Windows 需要 git bash 或 WSL)
    console.log('Extracting...');
    fs.mkdirSync(PYTHON_DIR, { recursive: true });

    const result = spawnSync('tar', ['xzf', tmp, '-C', PYTHON_DIR, '--strip-components=1'], {
      stdio: 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
    });

    if (result.status !== 0) {
      console.error('Failed to extract. Trying PowerShell fallback...');
      spawnSync(
        'powershell',
        ['-NoProfile', '-Command', `tar -xzf ${tmp} -C ${PYTHON_DIR} --strip-components=1`],
        { stdio: 'inherit' },
      );
    }

    fs.unlinkSync(tmp);
  }

  // 安装依赖
  const pipProc = spawnSync(
    PYTHON_EXE,
    ['-m', 'pip', 'install', '--upgrade', 'pip', '-q'],
    { stdio: 'inherit' },
  );

  // 合并所有插件的 requirements
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const allReqs = new Set();
  for (const cat of fs.readdirSync(pluginsDir)) {
    const catDir = path.join(pluginsDir, cat);
    if (!fs.statSync(catDir).isDirectory()) continue;
    for (const p of fs.readdirSync(catDir)) {
      const reqFile = path.join(catDir, p, 'python', 'requirements.txt');
      if (fs.existsSync(reqFile)) {
        const content = fs.readFileSync(reqFile, 'utf-8');
        for (const line of content.split('\n')) {
          const l = line.trim();
          if (l && !l.startsWith('#')) allReqs.add(l);
        }
      }
    }
  }

  if (allReqs.size > 0) {
    console.log('Installing plugin dependencies:', [...allReqs].join(', '));
    spawnSync(PYTHON_EXE, ['-m', 'pip', 'install', ...allReqs, '-q'], { stdio: 'inherit' });
  }

  console.log('Python runtime ready.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

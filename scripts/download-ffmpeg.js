/**
 * 下载 FFmpeg Windows 静态构建
 *
 * 用法: node scripts/download-ffmpeg.js
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_VERSION = '6.1';
const FFMPEG_DIR = path.join(process.cwd(), 'resources', 'ffmpeg');
const FFMPEG_EXE = path.join(FFMPEG_DIR, 'ffmpeg.exe');

// BtbN FFmpeg Builds (static, x64)
const URL = `https://github.com/BtbN/FFmpeg-/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip`;

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading FFmpeg from ${url}...`);
        const file = fs.createWriteStream(dest);
        https
            .get(url, { headers: { 'User-Agent': 'win-toolbox-setup' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return download(res.headers.location, dest).then(resolve, reject);
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }
                const total = parseInt(res.headers['content-length'] || '0');
                let downloaded = 0;
                res.on('data', (chunk) => {
                    downloaded += chunk.length;
                    if (total > 0) {
                        process.stdout.write(`\r  ${(downloaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`);
                    }
                });
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('\nDownload complete.');
                    resolve();
                });
            })
            .on('error', reject);
    });
}

async function main() {
    if (fs.existsSync(FFMPEG_EXE)) {
        console.log('FFmpeg already exists:', FFMPEG_EXE);
        return;
    }

    fs.mkdirSync(FFMPEG_DIR, { recursive: true });
    const tmp = path.join(require('os').tmpdir(), 'wintoolbox-ffmpeg.zip');

    try {
        await download(URL, tmp);
    } catch (err) {
        console.error('Download failed:', err.message);
        console.error('Please download FFmpeg manually from https://ffmpeg.org/download.html');
        process.exit(1);
    }

    console.log('Extracting FFmpeg...');
    try {
        // PowerShell Expand-Archive
        execSync(
            `powershell -NoProfile -Command "Expand-Archive -Path '${tmp}' -DestinationPath '${FFMPEG_DIR}' -Force"`,
            { stdio: 'inherit' },
        );

        // 找到解压出的子目录, 把 bin\ffmpeg.exe 提出来
        const entries = fs.readdirSync(FFMPEG_DIR, { withFileTypes: true });
        const subdir = entries.find((e) => e.isDirectory());
        if (subdir) {
            const src = path.join(FFMPEG_DIR, subdir.name, 'bin', 'ffmpeg.exe');
            const dest = path.join(FFMPEG_DIR, 'ffmpeg.exe');
            fs.copyFileSync(src, dest);
            // 清理子目录
            fs.rmSync(path.join(FFMPEG_DIR, subdir.name), { recursive: true, force: true });
        }
    } catch (err) {
        console.error('Extraction error:', err.message);
    } finally {
        fs.unlinkSync(tmp);
    }

    if (fs.existsSync(FFMPEG_EXE)) {
        console.log('FFmpeg ready:', FFMPEG_EXE);
    } else {
        console.error('FFmpeg not found after extraction');
        process.exit(1);
    }
}

main();

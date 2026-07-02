# Win Toolbox 🔧

> Windows 桌面工具箱 — 文档转换、视频处理、图片编辑,插件化可扩展。

## 功能

### 📄 文档转换
| 功能 | 输入 | 输出 |
|------|------|------|
| PDF → PPT | PDF | PPTX |
| PDF → Word | PDF | DOCX |
| Office → PDF | DOCX/PPTX/XLSX | PDF |
| PDF 提取 | PDF | TXT/JSON |
| MD → HTML | Markdown | HTML |

### 🎬 视频处理
- 格式互转 (MP4/MKV/AVI/WebM/GIF...)
- 压缩/转码
- 提取音轨
- 视频片段转 GIF

### 🖼️ 图片处理
- 分辨率调整 (批量缩放/裁剪)
- 格式转换 (PNG/JPG/WebP/AVIF)
- 图片压缩
- OCR 文字识别
- 批量水印

## PDF → PPT 转换策略

| 级别 | 策略 | 可编辑性 | 保真度 |
|------|------|----------|--------|
| L1 结构化 | 纯元素重建 (文本框/图片/表格) | ★★★★★ | ★★★☆☆ |
| L2 混合 (默认) | 结构化 + 背景图片兜底 | ★★★★☆ | ★★★★☆ |
| L3 截图 | 每页渲染整页图片 | ★☆☆☆☆ | ★★★★★ |

## 快速开始

### 前置要求
- Node.js ≥ 20
- Python 3.11 (可选,脚本可自动下载打包版)
- Git
- Windows 10/11 64-bit

### 开发

```bash
# 克隆
git clone https://github.com/<your-user>/win-toolbox.git
cd win-toolbox

# 安装依赖
npm ci

# 启动开发服务器
npm run dev:electron

# 安装嵌入 Python + 插件依赖
npm run prepare:python

# 下载 FFmpeg
npm run prepare:ffmpeg
```

### 打包发布

```bash
# 构建 + 打包 .exe 安装包
npm run dist

# 产物在 dist/ 目录:
# - Win Toolbox-Setup-x.x.x.exe   (NSIS 安装包)
# - Win Toolbox-Portable-x.x.x.exe (便携版)
```

## 项目结构

```
win-toolbox/
├── src/
│   ├── main/              # Electron 主进程
│   ├── preload/           # 渲染进程桥接
│   ├── renderer/          # React 前端
│   └── shared/            # 共享类型
├── plugins/               # 内置插件
│   ├── document/          # 文档转换
│   ├── video/             # 视频处理
│   └── image/             # 图片处理
├── python-runtime/        # 内嵌 Python (构建时下载)
├── resources/             # 原生二进制 (FFmpeg 等)
├── scripts/               # 构建辅助脚本
└── electron-builder.yml   # 打包配置
```

## 插件开发

参见 [docs/PLUGIN_DEV.md](docs/PLUGIN_DEV.md)。

每个插件目录结构:

```
plugins/<category>/<plugin-name>/
├── manifest.json          # 插件元数据
├── index.js               # Node 侧入口 (非 Python 插件)
└── python/                # Python 脚本 (可选)
    ├── main.py            # 转换逻辑
    └── requirements.txt   # Python 依赖
```

## License

MIT

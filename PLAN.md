# Win Toolbox — 开发方案

> Windows 桌面工具箱，聚焦文件转换与处理。开源免费、插件化可扩展。

---

## 一、项目定位

| 维度 | 决策 |
|------|------|
| 平台 | Windows 10/11 |
| 技术栈 | Electron + Node.js + React + TypeScript |
| 定位 | 开源免费工具，GitHub 分发 |
| 架构 | 插件化 — 每个转换功能是一个独立插件 |
| 安装包 | electron-builder 打包，~120MB（含 FFmpeg 等原生依赖） |

---

## 二、核心架构

```
┌──────────────────────────────────────────────────────┐
│                  Electron App                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Renderer     │  │   Main       │  │  Worker     │  │
│  │  (React UI)   │◄─┤   Process    │◄─┤  Threads    │  │
│  │              │  │  (Orchestra) │  │  (Heavy I/O) │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │ IPC             │ TaskQueue        │         │
│  ┌──────┴─────────────────┴─────────────────┴──────┐  │
│  │              Plugin Manager                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │  │
│  │  │ DocConv │ │ Video   │ │ Image   │ │ User  │ │  │
│  │  │ Plugin  │ │ Plugin  │ │ Plugin  │ │Plugin │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └───────┘ │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 关键模块

| 模块 | 职责 |
|------|------|
| **Plugin Manager** | 插件注册/发现/生命周期/依赖注入 |
| **Task Queue** | 并发控制、进度回调、暂停/恢复/取消 |
| **Main Process** | 文件 I/O、原生二进制调用、跨进程编排 |
| **Renderer (React)** | 拖拽上传、任务列表、设置面板 |
| **Worker Threads** | CPU 密集型操作（PDF 解析、图片缩放）不阻塞 UI |

---

## 三、插件系统设计

### 插件接口契约

```typescript
interface Plugin {
  id: string;           // 唯一标识，如 "doc-pdf-to-ppt"
  name: string;         // 显示名
  version: string;
  category: 'document' | 'video' | 'image' | 'audio';
  inputFormats: string[];
  outputFormats: string[];
  configSchema: JSONSchema;     // 用户可配置项

  // 核心方法
  validate(input: FileInfo[]): Promise<ValidationResult>;
  convert(
    inputs: FileInfo[],
    options: Record<string, unknown>,
    onProgress: (p: ProgressInfo) => void
  ): Promise<ConvertResult>;
}
```

### 内置插件清单

#### 📄 文档转换（Document）

| 插件 | 输入 | 输出 | 核心库 |
|------|------|------|--------|
| `doc-pdf-to-ppt` | PDF | PPTX | PyMuPDF + python-pptx（通过 Python 子进程） |
| `doc-pdf-to-word` | PDF | DOCX | pdf2docx / LibreOffice |
| `doc-pdf-extract` | PDF | TXT/CSV/JSON | pdfplumber |
| `doc-office-pdf` | DOCX/PPTX/XLSX | PDF | LibreOffice headless |
| `doc-markdown-html` | MD | HTML | marked + highlight.js |

#### 🎬 视频转换（Video）

| 插件 | 功能 | 核心库 |
|------|------|--------|
| `video-format` | 格式互转 (MP4/MKV/AVI/WebM/GIF...) | FFmpeg |
| `video-compress` | 码率/分辨率压缩 | FFmpeg |
| `video-extract-audio` | 提取音轨为 MP3/AAC/WAV | FFmpeg |
| `video-gif` | 视频片段转 GIF | FFmpeg + gifski |

#### 🖼️ 图片处理（Image）

| 插件 | 功能 | 核心库 |
|------|------|--------|
| `img-resize` | 分辨率调整 (缩放/裁剪/批量) | Sharp |
| `img-format` | 格式转 (PNG/JPG/WebP/AVIF/TIFF) | Sharp |
| `img-compress` | 有损/无损压缩 | Sharp / pngquant |
| `img-ocr` | 图片文字识别 (中英文) | Tesseract.js |
| `img-watermark` | 批量加水印 | Sharp |

---

## 四、PDF → PPT 混合策略（核心难点）

这是整个工具箱最复杂的功能，目标是 **可编辑 + 保留原有内容**。

### 4.1 技术选型

纯 Node.js 的 PDF 解析库（pdfjs-dist）只能提取文本和图片，无法获取精确排版和字体信息。因此采用 **Python 子进程** 方案：

```
Electron Main Process
    │
    ├─ spawn python scripts/pdf_to_ppt.py
    │       │
    │       ├─ PyMuPDF (fitz)        → 提取文本块、位置、字体、颜色
    │       ├─ pdfplumber            → 提取表格数据
    │       ├─ PyMuPDF 渲染          → 复杂区域/矢量图 → 高DPI图片
    │       ├─ python-pptx           → 结构化写入 PPT
    │       └─ stdout JSON progress  → 实时回调 Renderer
    │
    └─ 接收结果文件路径
```

### 4.2 混合策略流程

```
PDF 输入
  │
  ▼
┌─────────────────────────────┐
│ 1. 页面分析 (PyMuPDF)       │
│    - 识别文本块/段落        │
│    - 识别图片位置           │
│    - 识别表格区域           │
│    - 识别复杂背景/渐变      │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────┐
│ 简单元素 │  │ 复杂区域    │
│         │  │             │
│ • 文字   │  │ • 渐变背景  │
│ • 图片   │  │ • 矢量插画  │
│ • 表格   │  │ • 复杂图表  │
│ • 线条   │  │ • 特殊字体  │
└────┬────┘  └──────┬──────┘
     │              │
     ▼              ▼
┌─────────┐  ┌─────────────────┐
│ 用 PPT   │  │ 渲染为 300DPI   │
│ 原生元素 │  │ PNG → 作为     │
│ 重建:    │  │ Slide 背景图片  │
│ • TextBox│  │ (不可编辑但     │
│ • Picture│  │  视觉100%保真)  │
│ • Table  │  └────────┬────────┘
│ • Shape  │           │
└────┬────┘           │
     │                │
     └────────┬───────┘
              ▼
     ┌──────────────────┐
     │  合并到 PPT 页面  │
     │  文字元素在上层   │
     │  可编辑 + 背景保真│
     └──────────────────┘
```

### 4.3 坐标映射

PDF 坐标系（原点左上，单位 point）→ PPT 坐标系（EMU，1 inch = 914400 EMU）：

```
scale_x = slide_width_emu / pdf_page_width_pt
scale_y = slide_height_emu / pdf_page_height_pt

ppt_x = pdf_x * scale_x
ppt_y = pdf_y * scale_y
```

### 4.4 保真度分级

| 级别 | 策略 | 可编辑性 | 保真度 |
|------|------|----------|--------|
| **L1 结构化** | 纯元素重建 | ★★★★★ | ★★★☆☆ |
| **L2 混合**（默认） | 文字/表格重建 + 背景图片 | ★★★★☆ | ★★★★☆ |
| **L3 截图兜底** | 每页整页转图贴入 | ★☆☆☆☆ | ★★★★★ |

用户可在转换前选择级别。

### 4.5 特殊元素处理

| 元素 | 处理方式 |
|------|----------|
| 表格 | pdfplumber 提取 → PPT Table 对象重建，保留单元格边框 |
| 图表/图形 | 无法识别时 → 渲染为该区域图片嵌入 |
| 字体 | 原字体不存在时 → 映射到系统字体（配置 font-mapping.json） |
| 超链接 | 保留为 PPT Hyperlink |
| 数学公式 | 检测到 LaTeX 公式 → 渲染为图片嵌入 OCR |
| 多栏布局 | 按阅读顺序重排文本框，保持逻辑流 |

---

## 五、依赖关系

### Node.js 侧

| 依赖 | 用途 |
|------|------|
| `electron` | 主框架 |
| `react` + `react-dom` UI | + `antd` 或 `shadcn/ui` |
| `zustand` | 轻量状态管理 |
`sharp` | 图片处理 |
| `fluent-ffmpeg` | FFmpeg Node 绑定 |
| `winston` | 日志 |
`chokidar` | 文件监听 |

### Python 侧

```txt
PyMuPDF==1.24.x        # PDF 元素提取
pdfplumber==0.11.x     # 表格提取
python-pptx==1.0.x     # PPT 生成
python-docx==1.1.x     # Word 生成
Pillow==10.x           # 图片渲染辅助
```

Python 依赖打包进安装包（`python-build-standalone` 或内嵌 venv）。

### 原生二进制

| 工具 | 打包方式 |
|------|----------|
| FFmpeg | electron-builder `extraResources` |
| LibreOffice | 可选，首次使用时下载或便携版 |

---

## 六、打包策略（.exe / 安装包）

### 目标产物

| 产物 | 用途 | 体积 |
|------|------|------|
| `Win Toolbox-Setup-x.x.x.exe` | NSIS 安装向导，用户双击安装 | ~150MB |
| `Win Toolbox-Portable-x.x.x.exe` | 免安装便携版，解压即用 | ~180MB |

### 工具链

打包使用 **[electron-builder](https://www.electron.build/)**，Windows 目标选 **NSIS**：

```yaml
# electron-builder.yml
appId: com.wintoolbox.app
productName: Win Toolbox
directories:
  output: dist
  buildResources: build

files:
  - "out/**/*"
  - "package.json"

# 内嵌资源（不打包进 asar，运行时从 resources/ 读取）
extraResources:
  - "python-runtime/**/*"     # 内嵌 Python (~30MB)
  - "resources/ffmpeg/**/*"   # FFmpeg 二进制

# NSIS 安装器配置
nsis:
  oneClick: false                       # false = 显示安装向导
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Win Toolbox
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
  license: LICENSE

win:
  target:
    - target: nsis
      arch: [x64]                       # 只做 64 位，减小体积
  icon: build/icon.ico
```

### 包体积构成（预估）

```
Win Toolbox Setup.exe
├── Electron runtime .............. ~80MB
├── Chromium + Node.js ............ (含在上面)
├── 内嵌 Python (裁剪版) .......... ~30MB
├── FFmpeg (x64) .................. ~25MB
├── Node native modules (Sharp) .... ~10MB
├── 前端资源 (React build) ......... ~5MB
└── .......................... 总计 ~150MB
```

### 体积优化措施

| 措施 | 节省 |
|------|------|
| 只打 x64，不打 ia32 | ~40MB |
| 内嵌 Python 裁剪不常用包（python-build-standalone -t 选项） | ~20MB |
| asar 压缩 | ~15% |
| FFmpeg 只保留必要编解码器（编译时裁剪） | ~15MB |
| 文档类 LibreOffice 不内置，首次使用时下载 | ~200MB |

### 构建流程

```bash
# 1. 安装依赖
npm ci

# 2. 构建前端 + 主进程代码
npm run build                # vite build + tsc

# 3. 准备内嵌资源
npm run prepare:python       # 下载 python-build-standalone 到 python-runtime/
npm run prepare:ffmpeg       # 下载 FFmpeg static build 到 resources/ffmpeg/

# 4. 打包安装包
npm run dist                 # electron-builder --win --x64

# 产物: dist/Win Toolbox-Setup-0.1.0.exe
#       dist/Win Toolbox-Portable-0.1.0.exe
```

### GitHub Actions 自动发版

```yaml
# .github/workflows/release.yml
name: Build & Release
on:
  push:
    tags: ['v*']

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: npm ci
      - run: npm run prepare:python
      - run: npm run prepare:ffmpeg
      - run: npm run build
      - run: npm run dist
      - uses: softprops/action-gh-release@v2
        with:
          files: dist/*.exe
```

每次打 tag `v0.1.0` 自动出安装包和便携版，push release。

---

## 七、项目结构（见下方完整目录树，已包含 build/、资源、.github/workflows）

```
win-toolbox/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 入口
│   │   ├── ipc/                 # IPC handlers
│   │   ├── plugin-manager.ts    # 插件注册/调度
│   │   ├── task-queue.ts        # 任务队列
│   │   └── python-bridge.ts     # Python 子进程管理
│   │
│   ├── preload/                 # 上下文桥
│   │   └── index.ts
│   │
│   ├── renderer/                # React 前端
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx         # 插件入口网格
│   │   │   ├── TaskCenter.tsx   # 任务管理
│   │   │   └── Settings.tsx     # 设置
│   │   ├── components/
│   │   │   ├── FileDropZone.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── PluginCard.tsx
│   │   └── stores/
│   │       └── useTaskStore.ts
│   │
│   ├── shared/                  # 主渲染共享
│   │   ├── types.ts
│   │   └── constants.ts
│   │
│   └── workers/                 # Worker 线程
│       ├── pdf-worker.ts
│       └── image-worker.ts
│
├── plugins/                     # 内置插件
│   ├── document/
│   │   ├── pdf-to-ppt/
│   │   │   ├── manifest.json
│   │   │   ├── index.ts         # Node 侧编排
│   │   │   └── python/
│   │   │       ├── converter.py
│   │   │       └── requirements.txt
│   │   ├── pdf-to-word/
│   │   └── office-to-pdf/
│   ├── video/
│   │   ├── format-convert/
│   │   │   ├── manifest.json
│   │   │   └── index.ts
│   │   ├── compress/
│   │   └── extract-audio/
│   └── image/
│       ├── resize/
│       │   ├── manifest.json
│       │   └── index.ts
│       ├── format-convert/
│       └── compress/
│
├── python-runtime/              # 内嵌 Python
│   └── requirements.txt
│
├── resources/                   # 静态资源
│   ├── icons/
│   └── ffmpeg/                 # FFmpeg 二进制
│
├── build/                      # 打包资源配置
│   ├── icon.ico                # 应用图标
│   ├── icon.png
│   └── installer.nsh           # NSIS 自定义脚本（可选）
│
├── .github/
│   └── workflows/
│       └── release.yml         # CI/CD 自动构建发版
│
└── docs/
    ├── PLAN.md                 # 本文档
    ├── ARCHITECTURE.md
    └── PLUGIN_DEV.md           # 第三方插件开发指南
```

---

## 七、UI 设计概览

### 主界面

```
┌─────────────────────────────────────────────────────┐
│  🔧 Win Toolbox                           ─ □ ✕    │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│ 首页   │   拖拽文件到这里 或 点击选择文件             │
│ 📄 文档 │                                            │
│ 🎬 视频 │   ┌──────────────────────────────────┐     │
│ 🖼️ 图片 │   │                                  │     │
│ ⚙️ 设置 │   │        📁 虚线拖拽区域            │     │
│        │   │                                  │     │
│ ─────  │   └──────────────────────────────────┘     │
│ 任务   │                                            │
│ 历史   │   最近任务:                                 │
│        │   ┌─✅ report.pdf → report.pptx  12页 ─┐   │
│        │   │  🔄 video.mkv → video.mp4   45%    │   │
│        │   └────────────────────────────────────┘   │
└────────┴────────────────────────────────────────────┘
```

### 文档转换页面

```
┌─────────────────────────────────────────────────────┐
│ ← 返回    PDF → PPT 转换                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  已选文件: report.pdf (12页, 4.2MB)                  │
│                                                      │
│  转换策略:                                           │
│  ○ L1 结构化    ● L2 混合(推荐)    ○ L3 截图兜底     │
│                                                      │
│  PPT 比例:  ○ 4:3    ● 16:9    ○ 与源文件一致      │
│                                                      │
│  字体映射:  [缺失字体 → 微软雅黑 ▾]                  │
│                                                      │
│  输出目录:  D:\Output\  [更改...]                    │
│                                                      │
│           [ 开始转换 ]                               │
│                                                      │
│  进度: ████████████░░░░░░░░ 67%  (8/12 页)          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 八、开发路线（优先级排序）

### Phase 1: 骨架 + 文档转换（MVP）
> **目标**: 跑通插件系统 + 一个可用的 PDF→PPT

- [ ] Electron + React 工程初始化（Vite + electron-vite）
- [ ] Plugin Manager 核心接口定义与注册机制
- [ ] Task Queue 与进度 IPC 通道
- [ ] Python Bridge（spawn + JSON stdout + error 处理）
- [ ] PDF→PPT 插件（PyMuPDF 提取 + python-pptx 写入，L1 策略先跑通）
- [ ] L2 混合策略（背景图片兜底）
- [ ] L3 截图模式
- [ ] 拖拽上传 + 任务卡片 UI
- [ ] 安装包打包测试

**预估**: 2-3 周

---

### Phase 2: 视频 + 图片插件

- [ ] FFmpeg 集成 + 二进制打包
- [ ] video-format 插件（格式互转）
- [ ] video-compress 插件（参数面板）
- [ ] img-resize 插件（Sharp, 批量缩放）
- [ ] img-format 插件
- [ ] img-compress 插件
- [ ] Plugin 设置面板（按插件分 tab）

**预估**: 1-2 周

---

### Phase 3: 成熟化 + 插件生态

- [ ] 更多文档转换（PDF→Word, Office→PDF, Markdown→HTML）
- [ ] 历史记录持久化（SQLite/lowdb）
- [ ] 批量任务 + 文件夹监听
- [ ] 自定义插件加载器（用户指定目录）
- [ ] PLUGIN_DEV.md 文档
- [ ] GitHub Actions 自动构建多平台安装包
- [ ] 中文字体检测与自动映射
- [ ] 深色模式

**预估**: 2-3 周

---

### Phase 4: 高级功能（可选）

- [ ] OCR 集成（Tesseract / PaddleOCR）
- [ ] 视频截图/提取音轨
- [ ] 图片水印
- [ ] 云同步配置
- [ ] i18n 国际化

---

## 九、关键技术风险与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| Python 依赖打包进 Electron 体积大 | 🔴 高 | 用 `python-build-standalone` 裁剪到 ~30MB；允许用户自装 Python 路径 |
| PDF→PPT 版面还原度不够 | 🔴 高 | L2 混合策略兜底；提供预览 → 让用户选策略 |
| 复杂 PDF（扫描件/加密）处理 | 🟡 中 | 检测扫描件 → 自动走 L3 或启动 OCR；加密 PDF 弹窗要密码 |
| FFmpeg 二进制打包和 PATH 问题 | 🟡 中 | extraResources + 绝对路径调用，不走 PATH |
| Electron 安装包体积 | 🟡 中 | asar 压缩、只打包必要架构、Lazy-load 插件 |
| 大文件/多文件任务阻塞 | 🟢 低 | Worker 线程 + 流式处理 + 任务队列并发限制 |

---

## 十、仓库管理

```
GitHub: github.com/<user>/win-toolbox
├── main         稳定分支发布
├── develop      集成分支
├── feature/*    功能分支
└── release/*    发版分支

Tag:   v0.1.0-mvp
       v0.2.0-video-image
       v1.0.0
```

- Release 附 `.exe` 安装包（electron-builder GitHub Actions）
- Issues 标签: `bug`, `plugin`, `enhancement`, `help wanted`
- 贡献指南: `CONTRIBUTING.md` + `PLUGIN_DEV.md`

---

## 十一、我能开始的下一步

直接开始 Phase 1 的工程搭建。第一步：

1. **初始化 Electron + React + TS 工程**（electron-vite 模板）
2. **定义 Plugin 接口 + PluginManager**
3. **实现 Python Bridge**
4. **写 PDF→PPT 的 Python 转换脚本**
5. **跑通第一个端到端 demo**

要我直接开始写代码吗？

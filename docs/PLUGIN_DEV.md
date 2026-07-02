# 插件开发指南

每个插件是一个独立目录，包含元数据、Node 侧编排和（可选的）Python 转换脚本。

## 目录结构

```
plugins/<category>/<plugin-name>/
├── manifest.json        # 必需: 插件元数据
├── index.js             # 可选: Node 侧入口 (非 Python 插件必须)
└── python/              # 可选: Python 脚本
    ├── main.py          # 必需: 若 requiresPython=true
    ├── requirements.txt # 必需: Python 依赖
    └── *.py             # 其他辅助脚本
```

## manifest.json

```json
{
  "id": "doc-pdf-to-ppt",
  "name": "PDF 转 PPT",
  "description": "将 PDF 转换为可编辑 PPT",
  "version": "1.0.0",
  "category": "document",
  "inputFormats": ["pdf"],
  "outputFormats": ["pptx"],
  "author": "Win Toolbox",
  "icon": "📄",
  "requiresPython": true,
  "configSchema": {
    "type": "object",
    "properties": {
      "strategy": {
        "type": "string",
        "enum": ["structured", "hybrid", "screenshot"],
        "default": "hybrid"
      }
    }
  }
}
```

字段说明:

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识，如 `doc-pdf-to-ppt` |
| name | string | ✅ | 显示名 |
| description | string | ✅ | 简介 |
| version | string | ✅ | 语义版本号 |
| category | string | ✅ | `document` / `video` / `image` / `audio` |
| inputFormats | string[] | ✅ | 支持输入扩展名（不含点） |
| outputFormats | string[] | ✅ | 支持输出扩展名 |
| author | string | ❌ | 作者 |
| icon | string | ❌ | emoji 或图标名 |
| requiresPython | boolean | ❌ | 是否调用 Python（默认 false） |
| configSchema | JSON Schema | ❌ | 用户配置项 schema（Control 端自动生成 UI） |

## Python 插件协议

当 `requiresPython: true` 时，运行时调用 `python/main.py --mode json`：

### 输入 (stdin, 一行 JSON)

```json
{
  "inputs": ["D:/docs/report.pdf"],
  "options": {
    "strategy": "hybrid",
    "output_dir": "D:/output/"
  }
}
```

### 输出 (stdout, 逐行 JSON)

```json
{"type": "progress", "percent": 5, "stage": "正在打开 PDF..."}
{"type": "progress", "percent": 50, "stage": "处理第 6/12 页", "current": 6, "total": 12}
{"type": "progress", "percent": 95, "stage": "正在保存文件"}
{"type": "result", "outputFiles": ["D:/output/report.pptx"], "stats": {"pageCount": 12}}
```

### 错误

```json
{"type": "error", "message": "无法打开文件"}
```

## index.js (Node 侧)

当 `requiresPython: false` 时必须提供：

```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

module.exports = {
  // 插件 manifest
  createManifest: () => require('./manifest.json'),

  // 校验输入
  async validate(inputs) {
    const errors = [];
    for (const f of inputs) {
      const ext = path.extname(f.name).slice(1).toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        errors.push(`不支持的格式: ${f.name}`);
      }
    }
    return { valid: errors.length === 0, errors };
  },

  // 执行转换
  async convert(inputs, options, onProgress) {
    const outputDir = options.outputDir || path.dirname(inputs[0].path);
    const outputFiles = [];
    const total = inputs.length;

    for (let i = 0; i < total; i++) {
      const input = inputs[i];
      const outputPath = path.join(
        outputDir,
        `${path.parse(input.name).name}_resized.jpg`,
      );

      await sharp(input.path)
        .resize(options.width, options.height || null)
        .jpeg({ quality: options.quality || 85 })
        .toFile(outputPath);

      outputFiles.push(outputPath);
      onProgress({
        percent: Math.round(((i + 1) / total) * 100),
        stage: `处理 ${i + 1}/${total}`,
        current: i + 1,
        total,
      });
    }

    return {
      outputFiles,
      warnings: [],
      stats: { converted: total },
    };
  },
};
```

## 生命周期

1. App 启动 → PluginManager.discover() 扫描 `plugins/` 目录
2. 读取每个 manifest.json
3. 若 `requiresPython`，通过 Python Bridge 运行 python/main.py
4. 校验 → 转换 → 进度回调 → 完成/失败
5. 结果写入 Task Queue，通过 IPC 推送到前端

## 测试

开发插件时可直接在 Node 侧测试:

```bash
# 测试 Python 插件
echo '{"inputs":["test.pdf"],"options":{"strategy":"hybrid"}}' | \
  python plugins/document/pdf-to-ppt/python/main.py --mode json

# 测试 Node 插件
node -e "const p = require('./plugins/image/resize/index.js'); ..."
```

## 第三方插件安装

用户将插件目录放入 `%APPDATA%/win-toolbox/plugins/`，App 下次启动自动发现。

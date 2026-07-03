/**
 * Image Resize — Node.js plugin using Sharp
 *
 * Usage: window.toolbox.startTask({ pluginId: 'img-resize', inputs, options })
 *
 * Sharp must be installed as a production dep in package.json
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const VALID_INPUT = ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tiff'];

async function validate(inputs) {
  const errors = [];
  for (const f of inputs) {
    const ext = path.extname(f.name).slice(1).toLowerCase();
    if (!VALID_INPUT.includes(ext)) errors.push(`不支持: ${f.name}`);
  }
  return { valid: errors.length === 0, errors };
}

async function convert(inputs, options, onProgress) {
  const outputDir = options.outputDir || path.dirname(inputs[0].path);
  const format = options.format || 'same';
  const mode = options.mode || 'percent';
  const quality = options.quality || 85;

  fs.mkdirSync(outputDir, { recursive: true });
  const outputFiles = [];
  const total = inputs.length;

  for (let i = 0; i < total; i++) {
    const inp = inputs[i];
    const ext = format === 'same' ? path.extname(inp.name).slice(1) : format;
    const outName = `${path.parse(inp.name).name}_resized.${ext}`;
    const outputPath = path.join(outputDir, outName);

    let pipeline = sharp(inp.path);

    if (mode === 'percent') {
      const pct = (options.percent || 50) / 100;
      const meta = await sharp(inp.path).metadata();
      pipeline = pipeline.resize({
        width: Math.round(meta.width * pct),
        height: Math.round(meta.height * pct),
      });
    } else if (mode === 'width') {
      pipeline = pipeline.resize({ width: options.width });
    } else if (mode === 'height') {
      pipeline = pipeline.resize({ height: options.height });
    } else if (mode === 'fit') {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        fit: 'inside',
      });
    }

    switch (ext) {
      case 'jpg':
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: Math.round((100 - quality) / 11) });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
    }

    await pipeline.toFile(outputPath);
    outputFiles.push(outputPath);

    onProgress({
      percent: Math.round(((i + 1) / total) * 100),
      stage: `缩放 ${i + 1}/${total}`,
      current: i + 1,
      total,
    });
  }

  return {
    outputFiles,
    warnings: [],
    stats: { converted: total },
  };
}

module.exports = { validate, convert, createManifest: () => require('./manifest.json') };

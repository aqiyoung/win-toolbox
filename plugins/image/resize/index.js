/**
 * Image Resize — pure JS (Jimp) — no native deps, works inside asar
 */

const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const VALID = ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tiff'];

async function validate(inputs) {
  const errors = [];
  for (const f of inputs) {
    const ext = path.extname(f.name).slice(1).toLowerCase();
    if (!VALID.includes(ext)) errors.push(`不支持: ${f.name}`);
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

    const img = await Jimp.read(inp.path);
    const origW = img.getWidth();
    const origH = img.getHeight();

    let newW = origW, newH = origH;
    if (mode === 'percent') {
      const pct = (options.percent || 50) / 100;
      newW = Math.round(origW * pct);
      newH = Math.round(origH * pct);
    } else if (mode === 'width') {
      newW = options.width;
      newH = Math.round(origH * (options.width / origW));
    } else if (mode === 'height') {
      newH = options.height;
      newW = Math.round(origW * (options.height / origH));
    } else if (mode === 'fit') {
      // scale to fit within box
      const ratio = Math.min(options.width / origW, options.height / origH);
      newW = Math.round(origW * ratio);
      newH = Math.round(origH * ratio);
    }

    await img.resize(newW, newH);

    // Jimp quality: 0-100 for JPEG
    if (ext === 'jpg' || ext === 'jpeg') {
      img.quality(quality);
    }

    await img.writeAsync(outputPath);

    outputFiles.push(outputPath);
    onProgress({
      percent: Math.round(((i + 1) / total) * 100),
      stage: `缩放 ${i + 1}/${total}`,
      current: i + 1,
      total,
    });
  }

  return { outputFiles, warnings: [], stats: { converted: total } };
}

module.exports = { validate, convert, createManifest: () => require('./manifest.json') };

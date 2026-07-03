/**
 * Image Format Convert — Sharp-based format converter
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const VALID = ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'tiff', 'gif'];
const FORMAT_OPTS = {
  png:  () => ({}),
  jpg:  (q) => ({ jpeg: { quality: q } }),
  jpeg: (q) => ({ jpeg: { quality: q } }),
  webp: (q) => ({ webp: { quality: q } }),
  avif: (q) => ({ avif: { quality: q } }),
  tiff: () => ({}),
};

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
  const format = options.format || 'png';
  const quality = options.quality || 85;

  fs.mkdirSync(outputDir, { recursive: true });
  const outputFiles = [];
  const total = inputs.length;
  const formatKey = FORMAT_OPTS[format] ? format : 'png';

  for (let i = 0; i < total; i++) {
    const inp = inputs[i];
    const outName = `${path.parse(inp.name).name}.${format}`;
    const outputPath = path.join(outputDir, outName);

    await sharp(inp.path)
      [formatKey](FORMAT_OPTS[formatKey](quality))
      .toFile(outputPath);

    outputFiles.push(outputPath);
    onProgress({
      percent: Math.round(((i + 1) / total) * 100),
      stage: `转换 ${i + 1}/${total}`,
      current: i + 1,
      total,
    });
  }

  return { outputFiles, warnings: [], stats: { converted: total } };
}

module.exports = { validate, convert, createManifest: () => require('./manifest.json') };

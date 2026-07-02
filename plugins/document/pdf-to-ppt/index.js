/**
 * PDF -> PPT 插件 Node 侧编排
 *
 * manifest.json 自己描述的 requiresPython=true,
 * 所以 load-plugin.ts 会自动走 python-bridge。
 * 这个 index.js 暂时是个空壳,占位以便未来在 Node 侧做更多处理。
 */

module.exports = {
  createManifest: () => require('./manifest.json'),
};

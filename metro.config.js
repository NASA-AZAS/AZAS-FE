const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const threeModule = path.join(path.dirname(require.resolve('three')), 'three.module.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Three's CJS entry calls Node-only process.emitWarning; use one ESM instance everywhere.
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threeModule };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

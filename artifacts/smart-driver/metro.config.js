const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web, react-native-maps uses native-only codegen modules that crash Metro.
// Redirect the entire package to a simple stub for web bundling.
const rnMapsStub = path.resolve(__dirname, 'mocks/react-native-maps.js');

config.resolver = config.resolver || {};
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { filePath: rnMapsStub, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

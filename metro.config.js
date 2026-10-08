const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Gradle rewrites this generated directory while Metro is crawling node_modules.
// On Windows, that can make the fallback watcher try to watch a path that was
// removed between discovery and registration, causing an ENOENT crash.
config.resolver.blockList = [
  config.resolver.blockList,
  /[\\/]node_modules[\\/]expo-dev-launcher[\\/]expo-dev-launcher-gradle-plugin[\\/]build(?:[\\/].*)?$/,
];

module.exports = config;

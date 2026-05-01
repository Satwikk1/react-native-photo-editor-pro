const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Tell Metro to watch the parent directory so it can see your source files
config.watchFolders = [workspaceRoot];

// Tell Metro to resolve node_modules starting from the example app
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Explicitly tell Metro where to find the library and enforce correct React versions
config.resolver.extraNodeModules = {
  'react-native-photo-editor-pro': workspaceRoot,
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;

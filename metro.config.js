// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The cloned Python STT repo ships its own example React Native frontend under
// ./stt-service/frontend. Keep Metro from crawling it, otherwise it raises
// "duplicate module" (App.tsx / package.json) collisions and fails to bundle.
// blockList accepts a RegExp; match any path inside stt-service (either slash).
config.resolver.blockList = /[/\\]stt-service[/\\].*/;

module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Avoid watching Next.js ephemeral build outputs
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /[/\\]apps[/\\]web[/\\]\.next[/\\].*/,
];

// Normalize internal @noble/hashes/crypto.js imports to package-exported ./crypto
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalized = moduleName === '@noble/hashes/crypto.js' ? '@noble/hashes/crypto' : moduleName;
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, normalized, platform);
  }
  return context.resolveRequest(context, normalized, platform);
};

module.exports = config;

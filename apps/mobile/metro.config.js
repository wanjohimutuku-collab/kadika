const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep Metro's serverRoot aligned with projectRoot so Gradle's relative --entry-file resolves
// correctly in a pnpm monorepo (expo/metro-config otherwise sets unstable_serverRoot to repo root).
config.server = {
  ...config.server,
  unstable_serverRoot: __dirname,
};

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

// Firebase Phone Auth (ADR 048) needs the project's google-services.json at build time. EAS passes it
// as a file environment variable (GOOGLE_SERVICES_JSON); a local file next to this one also works.
// Without it the app builds as before: no Firebase, sign-in by our own SMS code.
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const local = path.join(__dirname, 'google-services.json');
  const file = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(local) ? local : null);
  if (!file) return config;
  return {
    ...config,
    android: { ...config.android, googleServicesFile: file },
    plugins: [
      ...(config.plugins ?? []),
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
    ],
  };
};

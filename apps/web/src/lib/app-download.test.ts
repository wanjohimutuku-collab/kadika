import { describe, expect, it } from 'vitest';
import { appLinksFrom, hostOf, safeHttpsUrl } from './app-download';

describe('app download links', () => {
  it('is "coming soon" when nothing is set', () => {
    expect(appLinksFrom({})).toEqual({ play: null, apk: null });
    expect(appLinksFrom({ ANDROID_PLAY_URL: '  ', ANDROID_APK_URL: '' })).toEqual({
      play: null,
      apk: null,
    });
  });

  it('keeps https links', () => {
    expect(
      appLinksFrom({
        ANDROID_PLAY_URL: 'https://play.google.com/store/apps/details?id=app.harusipass.mobile',
        ANDROID_APK_URL: ' https://kadisasa.com/downloads/kadi-sasa.apk ',
      }),
    ).toEqual({
      play: 'https://play.google.com/store/apps/details?id=app.harusipass.mobile',
      apk: 'https://kadisasa.com/downloads/kadi-sasa.apk',
    });
  });

  it('refuses anything that is not an absolute https URL', () => {
    for (const bad of [
      'http://kadisasa.com/app.apk',
      'javascript:alert(1)',
      'data:text/html,hi',
      '/downloads/app.apk',
      'kadisasa.com/app.apk',
      'not a url',
    ])
      expect(safeHttpsUrl(bad)).toBeNull();
  });

  it('names the host a download comes from', () => {
    expect(hostOf('https://www.kadisasa.com/downloads/kadi-sasa.apk')).toBe('kadisasa.com');
  });
});

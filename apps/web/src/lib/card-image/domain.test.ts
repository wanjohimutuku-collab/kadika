import { describe, expect, it } from 'vitest';
import { cardDomain } from './domain';

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

describe('cardDomain', () => {
  it('uses the host the proxy forwarded, not the container address', () => {
    expect(
      cardDomain(
        req('http://0.0.0.0:3000/api/card-image', { 'x-forwarded-host': 'app.kadisasa.com' }),
      ),
    ).toBe('app.kadisasa.com');
    expect(cardDomain(req('http://0.0.0.0:3000/x', { host: 'www.kadisasa.com' }))).toBe(
      'kadisasa.com',
    );
  });

  it('falls back to the app domain when only an internal address is known', () => {
    expect(cardDomain(req('http://0.0.0.0:3000/x'), 'kadisasa.com')).toBe('kadisasa.com');
    expect(cardDomain(req('http://127.0.0.1:3000/x'), 'kadisasa.com')).toBe('kadisasa.com');
    expect(cardDomain(req('http://10.0.1.7:3000/x'), 'kadisasa.com')).toBe('kadisasa.com');
  });

  it('keeps localhost in local development', () => {
    expect(cardDomain(req('http://localhost:3100/x'))).toBe('localhost:3100');
  });

  it('prefers an explicit domain parameter', () => {
    expect(cardDomain(req('http://0.0.0.0:3000/x?domain=kadisasa.co.ke'))).toBe('kadisasa.co.ke');
  });
});

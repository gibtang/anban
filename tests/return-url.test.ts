import { describe, it, expect } from 'bun:test';
import {
  safeReturnUrl,
  saveReturnUrl,
  loadReturnUrl,
  clearReturnUrl,
} from '../lib/auth/return-url';

describe('safeReturnUrl', () => {
  it('accepts relative paths', () => {
    expect(safeReturnUrl('/boards')).toBe('/boards');
    expect(safeReturnUrl('/board/6a11c42e?card=6a89210d')).toBe(
      '/board/6a11c42e?card=6a89210d'
    );
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeReturnUrl('https://evil.com')).toBeNull();
    expect(safeReturnUrl('//evil.com')).toBeNull();
    expect(safeReturnUrl('/\\evil.com')).toBeNull();
    expect(safeReturnUrl('http://evil.com/board')).toBeNull();
  });

  it('rejects encoded absolute URLs', () => {
    expect(safeReturnUrl('https%3A%2F%2Fevil.com')).toBeNull();
    expect(safeReturnUrl('%2F%2Fevil.com')).toBeNull();
  });

  it('rejects malformed percent-encoding without throwing', () => {
    expect(safeReturnUrl('/board%')).toBeNull();
    expect(safeReturnUrl('%ZZ')).toBeNull();
  });

  it('rejects empty and non-path values', () => {
    expect(safeReturnUrl(null)).toBeNull();
    expect(safeReturnUrl('')).toBeNull();
    expect(safeReturnUrl('boards')).toBeNull();
  });
});

describe('return-url sessionStorage round trip', () => {
  it('saves, loads, and clears a validated URL', () => {
    saveReturnUrl('/board/6a11c42e?card=6a89210d');
    expect(loadReturnUrl()).toBe('/board/6a11c42e?card=6a89210d');
    clearReturnUrl();
    expect(loadReturnUrl()).toBeNull();
  });

  it('never persists an unsafe value', () => {
    saveReturnUrl('//evil.com');
    expect(loadReturnUrl()).toBeNull();
    saveReturnUrl('https://evil.com');
    expect(loadReturnUrl()).toBeNull();
  });
});

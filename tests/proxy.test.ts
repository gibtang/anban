import { describe, it, expect } from 'bun:test';
import { isPublicRoute } from '../proxy';

describe('isPublicRoute', () => {
  it('allows the getting started page for guests', () => {
    expect(isPublicRoute('/getting-started')).toBe(true);
  });

  it('keeps dashboard routes protected', () => {
    expect(isPublicRoute('/boards')).toBe(false);
  });
});

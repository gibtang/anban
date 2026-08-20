import { describe, test, expect } from 'bun:test';
import { isUnauthorizedError, unauthorizedResponse } from '../lib/auth/helpers';

const URL_IN_MESSAGE = 'https://www.getanban.com/skill.md';

describe('isUnauthorizedError', () => {
  test('true for thrown Unauthorized errors', () => {
    expect(isUnauthorizedError(new Error('Unauthorized'))).toBe(true);
    expect(isUnauthorizedError(new Error('Unauthorized: Missing Bearer token'))).toBe(true);
  });

  test('false for other errors and non-errors', () => {
    expect(isUnauthorizedError(new Error('Board not found'))).toBe(false);
    expect(isUnauthorizedError('Unauthorized')).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
  });
});

describe('unauthorizedResponse', () => {
  test('returns 401 with JSON error body', async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
  });

  test('message includes the skill.md URL', async () => {
    const body = await unauthorizedResponse().json();
    expect(body.error).toContain(URL_IN_MESSAGE);
  });

  test('keeps detail and strips a leading "Unauthorized:" prefix', async () => {
    const body = await unauthorizedResponse('Unauthorized: Invalid or revoked token').json();
    expect(body.error).toBe(
      'Unauthorized: Invalid or revoked token. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });

  test('bare "Unauthorized" detail collapses to the generic message', async () => {
    const body = await unauthorizedResponse('Unauthorized').json();
    expect(body.error).toBe(
      'Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });

  test('no detail yields the generic message', async () => {
    const body = await unauthorizedResponse().json();
    expect(body.error).toBe(
      'Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });
});

import { describe, test, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/boards/route';

describe('user API 401 self-service', () => {
  beforeEach(() => {
    delete process.env.DISABLE_AUTH; // verifyAuth short-circuits when 'true'
  });

  test('no-cookie call returns 401 pointing at skill.md', async () => {
    const res = await GET(new NextRequest('http://localhost/api/boards'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe(
      'Unauthorized. Read the skill.md for API access and troubleshooting: https://www.getanban.com/skill.md'
    );
  });
});

import { describe, test, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/agent/boards/route';

describe('agent API 401 self-service', () => {
  test('no-token call returns 401 pointing at skill.md', async () => {
    const res = await GET(new NextRequest('http://localhost/api/agent/boards'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('https://www.getanban.com/skill.md');
    expect(body.error).toContain('Missing Bearer token');
  });
});

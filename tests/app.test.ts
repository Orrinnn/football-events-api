import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('App routes', () => {
  it('GET / should return api info', async () => {
    const res = await app.request('/');

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toBe('Football Events API');
  });

  it('GET /events should return paginated events', async () => {
    const res = await app.request('/events');

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  it('GET /events/999999 should return 404', async () => {
    const res = await app.request('/events/999999');
    expect(res.status).toBe(404);
  });

  it('POST /events without token should return 401', async () => {
    const res = await app.request('/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Event',
        description: 'Test',
        eventDate: new Date().toISOString(),
        categoryId: 1,
        venueId: 1,
        teamId: 1,
      }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /auth/login should succeed with valid admin credentials', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@footballevents.is',
        password: 'admin123',
      }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.message).toBe('Login successful');
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('admin@footballevents.is');
  });

  it('POST /auth/login should fail with invalid password', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@footballevents.is',
        password: 'wrongpassword',
      }),
    });

    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Invalid email or password');
  });

  it('POST /categories should return 401 without token', async () => {
    const res = await app.request('/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'new-category',
      }),
    });

    expect(res.status).toBe(401);
  });
});
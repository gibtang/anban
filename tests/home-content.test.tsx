import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomeContent from '../app/HomeContent';
import { AuthContext } from '../app/contexts/AuthContext';

describe('HomeContent', () => {
  it('renders the landing page content even while auth is loading', () => {
    const html = renderToStaticMarkup(
      <AuthContext.Provider
        value={{
          user: null,
          loading: true,
          signIn: async () => {},
          signUp: async () => {},
          logout: async () => {},
          signInWithGoogle: async () => {},
          resetPassword: async () => {},
        }}
      >
        <HomeContent />
      </AuthContext.Provider>,
    );

    expect(html).toContain('Kanban Boards for');
    expect(html).toContain('Try Cloud Version');
    expect(html).not.toContain('animate-spin');
  });
});

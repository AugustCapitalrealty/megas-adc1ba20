import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const useAuthMock = vi.fn();

vi.mock('@/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useAuth')>('@/hooks/useAuth');
  return {
    ...actual,
    useAuth: () => useAuthMock(),
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: () => <div>layout-ok</div>,
}));

import { ProtectedShell, RequireRole } from '@/routes/guards';

describe('route guards', () => {
  it('redirects anonymous users to login', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false, isApproved: false, isMasterUser: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ProtectedShell />} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('renders protected layout when approved', () => {
    useAuthMock.mockReturnValue({ user: { id: '1' }, loading: false, isApproved: true, isMasterUser: false });

    render(
      <MemoryRouter>
        <ProtectedShell />
      </MemoryRouter>
    );

    expect(screen.getByText('layout-ok')).toBeInTheDocument();
  });

  it('blocks admin-only route for non-admin', () => {
    useAuthMock.mockReturnValue({ isBackofficeOrAdmin: true, isAdmin: false });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <div>admin-content</div>
              </RequireRole>
            }
          />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('home')).toBeInTheDocument();
  });
});

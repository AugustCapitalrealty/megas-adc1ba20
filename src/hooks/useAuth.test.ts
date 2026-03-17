import { deriveAuthState } from './auth-state';
import type { Profile } from '@/types';

const profile: Profile = {
  id: '1',
  email: 'user@mega.com',
  full_name: 'User',
  avatar_url: null,
  approved: true,
  created_at: '',
  updated_at: '',
  onboarding_completed_at: null,
};

describe('deriveAuthState', () => {
  it('marks super_admin as approved even when profile is not approved', () => {
    const result = deriveAuthState({
      profile: { ...profile, approved: false },
      roles: ['super_admin'],
      impersonatedProfile: null,
      impersonatedRoles: [],
    });

    expect(result.isMasterUser).toBe(true);
    expect(result.isApproved).toBe(true);
  });

  it('uses impersonated role set for effective access checks', () => {
    const result = deriveAuthState({
      profile,
      roles: ['super_admin'],
      impersonatedProfile: { ...profile, id: '2' },
      impersonatedRoles: ['backoffice'],
    });

    expect(result.isImpersonating).toBe(true);
    expect(result.effectiveRoles).toEqual(['backoffice']);
    expect(result.effectiveProfile?.id).toBe('2');
  });
});

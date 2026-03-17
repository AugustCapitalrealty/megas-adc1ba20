import type { AppRole, Profile } from '@/types';

interface DerivedAuthStateInput {
  profile: Profile | null;
  roles: AppRole[];
  impersonatedProfile: Profile | null;
  impersonatedRoles: AppRole[];
}

export function deriveAuthState({
  profile,
  roles,
  impersonatedProfile,
  impersonatedRoles,
}: DerivedAuthStateInput) {
  const isMasterUser = roles.includes('super_admin');
  const isImpersonating = isMasterUser && impersonatedProfile !== null;
  const isApproved = isMasterUser || (profile?.approved ?? false);
  const effectiveProfile = isImpersonating ? impersonatedProfile : profile;
  const effectiveRoles = isImpersonating ? impersonatedRoles : roles;

  return {
    isMasterUser,
    isImpersonating,
    isApproved,
    effectiveProfile,
    effectiveRoles,
  };
}

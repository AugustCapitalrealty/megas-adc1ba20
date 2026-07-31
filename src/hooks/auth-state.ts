import type { AppRole, Profile } from '@/types';
import type { AppAccessMap, AppKey, AppRoleLevel } from '@/lib/app-access';
import { appRoleRank } from '@/lib/app-access';

interface DerivedAuthStateInput {
  profile: Profile | null;
  roles: AppRole[];
  impersonatedProfile: Profile | null;
  impersonatedRoles: AppRole[];
  appAccess?: AppAccessMap;
  impersonatedAppAccess?: AppAccessMap;
}

export function deriveAuthState({
  profile,
  roles,
  impersonatedProfile,
  impersonatedRoles,
  appAccess = {},
  impersonatedAppAccess = {},
}: DerivedAuthStateInput) {
  const isMasterUser = roles.includes('super_admin');
  const isImpersonating = isMasterUser && impersonatedProfile !== null;
  const isApproved = isMasterUser || (profile?.approved ?? false);
  const effectiveProfile = isImpersonating ? impersonatedProfile : profile;
  const effectiveRoles = isImpersonating ? impersonatedRoles : roles;
  const effectiveAppAccess = isImpersonating ? impersonatedAppAccess : appAccess;
  const isSuper = isMasterUser && !isImpersonating;

  const hasApp = (app: AppKey) => isSuper || effectiveAppAccess[app] !== undefined;
  const appRole = (app: AppKey): AppRoleLevel | undefined => effectiveAppAccess[app];
  const canApp = (app: AppKey, minimo: AppRoleLevel) =>
    isSuper || appRoleRank(effectiveAppAccess[app]) >= appRoleRank(minimo);

  return {
    isMasterUser,
    isImpersonating,
    isApproved,
    effectiveProfile,
    effectiveRoles,
    effectiveAppAccess,
    hasApp,
    appRole,
    canApp,
  };
}

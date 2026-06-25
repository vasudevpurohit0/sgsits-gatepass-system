import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import type { UserRole } from '../types/auth.types';

/**
 * Custom React hook for checking client-side RBAC permissions
 */
export const usePermissions = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  /**
   * Verify if current user is of one of the allowed roles
   */
  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  /**
   * Check if current user has permission to execute specific actions
   */
  const can = (action: string): boolean => {
    if (!user) return false;
    const role = user.role;

    switch (action) {
      case 'create_pass':
        return ['STUDENT', 'FACULTY', 'STAFF', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'create_security_pass':
        return ['SECURITY_GUARD', 'SECURITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'approve_pass':
        return ['SECURITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'scan_qr':
        return ['SECURITY_GUARD', 'SECURITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'view_audit_logs':
        return ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'trigger_lockdown':
        return ['SECURITY_GUARD', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'manage_users':
        return ['UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      case 'configure_system':
        return ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'].includes(role);
      default:
        return false;
    }
  };

  return {
    user,
    role: user?.role || null,
    hasRole,
    can,
  };
};

export default usePermissions;

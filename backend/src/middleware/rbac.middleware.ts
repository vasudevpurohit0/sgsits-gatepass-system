import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import ApiError from '../utils/ApiError';

/**
 * Require user to have one of the allowed roles
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, 'Forbidden: You do not have the required role to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Define all possible system actions
export type SystemPermission =
  | 'view_own_pass' | 'view_all_passes' | 'create_visitor_pass' | 'create_hostel_pass' | 'create_event_pass' | 'create_vehicle_pass'
  | 'create_security_pass'
  | 'approve_pass' | 'reject_pass' | 'revoke_pass' | 'delete_pass' | 'bulk_generate_passes' | 'export_passes'
  | 'scan_qr' | 'log_entry_exit' | 'view_entry_logs' | 'manual_override' | 'trigger_lockdown'
  | 'view_own_profile' | 'edit_own_profile' | 'create_users' | 'deactivate_users' | 'assign_roles' | 'manage_system'
  | 'view_audit_logs' | 'view_security_alerts' | 'configure_system';

// Mapping permissions to allowed UserRoles based on the RBAC Permission Matrix
const PERMISSION_ROLES_MAP: Record<SystemPermission, UserRole[]> = {
  view_own_pass: ['VISITOR', 'STUDENT', 'FACULTY', 'STAFF', 'SECURITY_GUARD', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  view_all_passes: ['SECURITY_GUARD', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN', 'FACULTY'], // WARDEN and FACULTY will have query scopes limited in repository/service layer
  create_visitor_pass: ['STUDENT', 'FACULTY', 'STAFF', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  create_hostel_pass: ['STUDENT', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  create_event_pass: ['FACULTY', 'STAFF', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  create_vehicle_pass: ['STAFF', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  create_security_pass: ['SECURITY_GUARD', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  approve_pass: ['SECURITY_ADMIN', 'SUPER_ADMIN'],
  reject_pass: ['SECURITY_ADMIN', 'SUPER_ADMIN'],
  revoke_pass: ['STUDENT', 'FACULTY', 'STAFF', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'], // Student/Faculty/Staff own only validation is done in service layer
  delete_pass: ['UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  bulk_generate_passes: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  export_passes: ['FACULTY', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  
  scan_qr: ['SECURITY_GUARD', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  log_entry_exit: ['SECURITY_GUARD', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  view_entry_logs: ['STUDENT', 'FACULTY', 'SECURITY_GUARD', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  manual_override: ['SECURITY_GUARD', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  trigger_lockdown: ['SECURITY_GUARD', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  
  view_own_profile: ['VISITOR', 'STUDENT', 'FACULTY', 'STAFF', 'SECURITY_GUARD', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  edit_own_profile: ['VISITOR', 'STUDENT', 'FACULTY', 'STAFF', 'SECURITY_GUARD', 'HOSTEL_WARDEN', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  create_users: ['UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  deactivate_users: ['UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  assign_roles: ['UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  manage_system: ['SUPER_ADMIN'],

  view_audit_logs: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  view_security_alerts: ['SECURITY_GUARD', 'SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
  configure_system: ['SECURITY_ADMIN', 'UNIVERSITY_ADMIN', 'SUPER_ADMIN'],
};

/**
 * Require user to possess a specific permission
 */
export const requirePermission = (permission: SystemPermission) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized');
      }

      const allowedRoles = PERMISSION_ROLES_MAP[permission];
      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, 'Forbidden: You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

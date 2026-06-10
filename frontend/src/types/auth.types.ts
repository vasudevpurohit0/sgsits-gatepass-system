export type UserRole =
  | 'VISITOR'
  | 'STUDENT'
  | 'FACULTY'
  | 'STAFF'
  | 'SECURITY_GUARD'
  | 'HOSTEL_WARDEN'
  | 'SECURITY_ADMIN'
  | 'UNIVERSITY_ADMIN'
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string | null;
  role: UserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  mfaRequiredEmail: string | null; // Temporary state to track login details if MFA is needed
}

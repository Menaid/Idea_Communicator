export enum UserRole {
  USER = 'user',
  GROUP_ADMIN = 'group_admin',
  GLOBAL_ADMIN = 'global_admin',
}

export enum DataRegion {
  SWEDEN = 'sweden',
  EU = 'eu',
  USA = 'usa',
  CANADA = 'canada',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  dataRegion: DataRegion;
  gdprConsentGiven: boolean;
  gdprConsentDate?: string;
  marketingConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dataRegion?: DataRegion;
  gdprConsentGiven: boolean;
  marketingConsent?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

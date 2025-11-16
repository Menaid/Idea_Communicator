export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  onlineStatus: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

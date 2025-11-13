import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  AuthResponse,
  RegisterData,
  LoginData,
  User,
  UpdateUserData,
  ChangePasswordData,
} from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private api: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest && !originalRequest.headers['X-Retry']) {
          // Try to refresh token
          try {
            const newToken = await this.refreshAccessToken();

            if (newToken && originalRequest.headers) {
              originalRequest.headers['X-Retry'] = 'true';
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await axios.post<AuthResponse>(
          `${API_URL}/api/auth/refresh`,
          { refreshToken }
        );

        this.setTokens(response.data.accessToken, response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return response.data.accessToken;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  // Auth endpoints
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data);
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', data);
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await this.api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.clearTokens();
  }

  async getMe(): Promise<User> {
    const response = await this.api.post<User>('/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  // User endpoints
  async updateProfile(data: UpdateUserData): Promise<User> {
    const response = await this.api.patch<User>('/users/me', data);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await this.api.post('/users/me/change-password', data);
  }

  async exportData(): Promise<any> {
    const response = await this.api.get('/users/me/export');
    return response.data;
  }

  async requestDeletion(): Promise<void> {
    await this.api.delete('/users/me');
    this.clearTokens();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Get current user from localStorage
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const apiService = new ApiService();

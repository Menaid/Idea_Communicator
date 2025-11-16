import api from './api';
import { User } from '../types/auth';

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async getOne(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async search(query: string): Promise<User[]> {
    const response = await api.get<User[]>('/users/search', {
      params: { q: query },
    });
    return response.data;
  },
};

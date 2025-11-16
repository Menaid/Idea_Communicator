import api from './api.service';
import { Group, GroupMember, CreateGroupData, UpdateGroupData } from '../types/group.types';

export const groupsService = {
  async getAll(): Promise<Group[]> {
    const response = await api.get<Group[]>('/groups');
    return response.data;
  },

  async getOne(id: string): Promise<Group> {
    const response = await api.get<Group>(`/groups/${id}`);
    return response.data;
  },

  async create(data: CreateGroupData): Promise<Group> {
    const response = await api.post<Group>('/groups', data);
    return response.data;
  },

  async update(id: string, data: UpdateGroupData): Promise<Group> {
    const response = await api.put<Group>(`/groups/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/groups/${id}`);
  },

  async getMembers(groupId: string): Promise<GroupMember[]> {
    const response = await api.get<GroupMember[]>(`/groups/${groupId}/members`);
    return response.data;
  },

  async addMember(groupId: string, userId: string, role?: string): Promise<GroupMember> {
    const response = await api.post<GroupMember>(`/groups/${groupId}/members`, {
      userId,
      role,
    });
    return response.data;
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },
};

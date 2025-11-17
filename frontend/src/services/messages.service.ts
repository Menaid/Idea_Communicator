import api from './api';
import { Message, CreateMessageData, UpdateMessageData } from '../types/message.types';

export const messagesService = {
  async getByGroup(groupId: string, limit?: number, before?: string): Promise<Message[]> {
    const params: any = {};
    if (limit) params.limit = limit;
    if (before) params.before = before;

    const response = await api.get<Message[]>(`/messages/group/${groupId}`, { params });
    return response.data;
  },

  async getOne(id: string): Promise<Message> {
    const response = await api.get<Message>(`/messages/${id}`);
    return response.data;
  },

  async create(data: CreateMessageData): Promise<Message> {
    const response = await api.post<Message>('/messages', data);
    return response.data;
  },

  async update(id: string, data: UpdateMessageData): Promise<Message> {
    const response = await api.put<Message>(`/messages/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/messages/${id}`);
  },
};

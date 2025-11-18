import { User } from './auth.types';

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  sender: User;
  content: string;
  type: string;
  metadata?: any;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageData {
  groupId: string;
  content: string;
  type?: string;
  metadata?: any;
}

export interface UpdateMessageData {
  content: string;
}

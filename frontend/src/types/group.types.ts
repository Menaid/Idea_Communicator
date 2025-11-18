import { User } from './auth.types';

export interface Group {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  type: string;
  isActive: boolean;
  createdById: string;
  createdBy: User;
  members: GroupMember[];
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: string;
  isActive: boolean;
  lastReadAt: Date;
  joinedAt: Date;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

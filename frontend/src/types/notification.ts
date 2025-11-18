import { User } from './auth';

export enum NotificationType {
  GROUP_INVITATION = 'group_invitation',
  NEW_MESSAGE = 'new_message',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
}

export interface Notification {
  id: string;
  userId: string;
  user?: User;
  type: NotificationType;
  title: string;
  message?: string;
  groupId?: string;
  group?: {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
  };
  actorId?: string;
  actor?: User;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

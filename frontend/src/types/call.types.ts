export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum CallStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

export interface Call {
  id: string;
  groupId: string;
  initiatorId: string;
  type: CallType;
  status: CallStatus;
  startedAt: Date;
  endedAt?: Date;
  participants: CallParticipant[];
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  joinedAt: Date;
  leftAt?: Date;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface StartCallDto {
  groupId: string;
  type: CallType;
}

export interface JoinCallDto {
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}

// WebRTC peer information
export interface Peer {
  id: string;
  userId: string;
  displayName: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShare: boolean;
}

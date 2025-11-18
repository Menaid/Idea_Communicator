import * as mediasoup from 'mediasoup-client';

/**
 * WebRTC Types for Frontend
 * Based on backend types but adapted for client-side usage
 */

/**
 * Peer info from server
 */
export interface PeerInfo {
  peerId: string;
  userId: string;
}

/**
 * Transport info received from server
 */
export interface TransportInfo {
  id: string;
  iceParameters: mediasoup.types.IceParameters;
  iceCandidates: mediasoup.types.IceCandidate[];
  dtlsParameters: mediasoup.types.DtlsParameters;
}

/**
 * Producer info from server
 */
export interface ProducerInfo {
  id: string;
  kind: mediasoup.types.MediaKind;
  peerId: string;
  userId: string;
}

/**
 * Consumer info from server
 */
export interface ConsumerInfo {
  id: string;
  producerId: string;
  kind: mediasoup.types.MediaKind;
  rtpParameters: mediasoup.types.RtpParameters;
  peerId: string;
  userId: string;
}

/**
 * Local participant info
 */
export interface LocalParticipant {
  userId: string;
  stream: MediaStream | null;
  audioProducerId: string | null;
  videoProducerId: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

/**
 * Remote participant info
 */
export interface RemoteParticipant {
  peerId: string;
  userId: string;
  stream: MediaStream;
  audioConsumerId: string | null;
  videoConsumerId: string | null;
}

/**
 * Socket event request types
 */
export interface CreateRoomRequest {
  callId: string;
}

export interface CreateRoomResponse {
  rtpCapabilities: mediasoup.types.RtpCapabilities;
}

export interface JoinRoomRequest {
  callId: string;
  userId: string;
  rtpCapabilities: mediasoup.types.RtpCapabilities;
}

export interface JoinRoomResponse {
  peers: PeerInfo[];
}

export interface CreateTransportRequest {
  callId: string;
  direction: 'send' | 'recv';
}

export interface CreateTransportResponse {
  transport: TransportInfo;
}

export interface ConnectTransportRequest {
  callId: string;
  transportId: string;
  dtlsParameters: mediasoup.types.DtlsParameters;
}

export interface ProduceRequest {
  callId: string;
  transportId: string;
  kind: mediasoup.types.MediaKind;
  rtpParameters: mediasoup.types.RtpParameters;
  appData?: any;
}

export interface ProduceResponse {
  id: string;
}

export interface ConsumeRequest {
  callId: string;
  transportId: string;
  producerId: string;
  rtpCapabilities: mediasoup.types.RtpCapabilities;
}

export interface ConsumeResponse {
  consumer: ConsumerInfo;
}

export interface ResumeConsumerRequest {
  callId: string;
  consumerId: string;
}

export interface LeaveRoomRequest {
  callId: string;
}

export interface GetProducersRequest {
  callId: string;
}

export interface GetProducersResponse {
  producers: ProducerInfo[];
}

/**
 * Socket.IO response wrapper
 */
export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server-to-client events (broadcasts)
 */
export interface ServerToClientEvents {
  'newProducer': (data: { producerId: string; peerId: string; userId: string; kind: mediasoup.types.MediaKind }) => void;
  'peerClosed': (data: { peerId: string }) => void;
  'producerClosed': (data: { producerId: string; peerId: string }) => void;
}

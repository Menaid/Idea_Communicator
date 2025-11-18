import * as mediasoup from 'mediasoup';
import { Socket } from 'socket.io';

/**
 * Peer represents a participant in a WebRTC room
 */
export interface Peer {
  id: string; // Socket ID
  userId: string; // User ID from backend
  callId: string; // Call/Room ID
  transports: Map<string, mediasoup.types.WebRtcTransport>;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
  socket: Socket;
  rtpCapabilities?: mediasoup.types.RtpCapabilities;
}

/**
 * Room represents a WebRTC session (one per call)
 */
export interface Room {
  id: string; // Same as callId from backend
  router: mediasoup.types.Router;
  peers: Map<string, Peer>; // peerId -> Peer
  createdAt: Date;
}

/**
 * Transport info for client
 */
export interface TransportInfo {
  id: string;
  iceParameters: mediasoup.types.IceParameters;
  iceCandidates: mediasoup.types.IceCandidate[];
  dtlsParameters: mediasoup.types.DtlsParameters;
}

/**
 * Producer info for client
 */
export interface ProducerInfo {
  id: string;
  kind: mediasoup.types.MediaKind;
  peerId: string;
  userId: string;
}

/**
 * Consumer info for client
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
 * Socket event payloads
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
  peers: Array<{
    peerId: string;
    userId: string;
  }>;
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

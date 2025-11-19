import io, { Socket } from 'socket.io-client';
import type * as mediasoup from 'mediasoup-client';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  CreateTransportRequest,
  CreateTransportResponse,
  ConnectTransportRequest,
  ProduceRequest,
  ProduceResponse,
  ConsumeRequest,
  ConsumeResponse,
  ResumeConsumerRequest,
  GetProducersRequest,
  GetProducersResponse,
  LeaveRoomRequest,
  SocketResponse,
  ServerToClientEvents,
} from '../types/webrtc.types';

const WEBRTC_URL = import.meta.env.VITE_WEBRTC_URL || 'http://localhost:5000';

/**
 * Signaling Service
 * Handles Socket.IO communication with WebRTC server
 */
class SignalingService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, (...args: any[]) => void> = new Map();

  /**
   * Connect to WebRTC signaling server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('[Signaling] Already connected');
        resolve();
        return;
      }

      console.log('[Signaling] Connecting to:', WEBRTC_URL);

      this.socket = io(WEBRTC_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Signaling] Connected, socket ID:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Signaling] Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Signaling] Disconnected:', reason);
      });

      this.socket.on('error', (error) => {
        console.error('[Signaling] Socket error:', error);
      });
    });
  }

  /**
   * Disconnect from signaling server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[Signaling] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Create or join a room
   */
  async createRoom(callId: string): Promise<CreateRoomResponse> {
    const request: CreateRoomRequest = { callId };
    return this.emit<CreateRoomResponse>('createRoom', request);
  }

  /**
   * Join a room as a peer
   */
  async joinRoom(
    callId: string,
    userId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities
  ): Promise<JoinRoomResponse> {
    const request: JoinRoomRequest = { callId, userId, rtpCapabilities };
    return this.emit<JoinRoomResponse>('joinRoom', request);
  }

  /**
   * Create a WebRTC transport
   */
  async createTransport(
    callId: string,
    direction: 'send' | 'recv'
  ): Promise<CreateTransportResponse> {
    const request: CreateTransportRequest = { callId, direction };
    return this.emit<CreateTransportResponse>('createTransport', request);
  }

  /**
   * Connect a transport with DTLS parameters
   */
  async connectTransport(
    callId: string,
    transportId: string,
    dtlsParameters: mediasoup.types.DtlsParameters
  ): Promise<void> {
    const request: ConnectTransportRequest = { callId, transportId, dtlsParameters };
    await this.emit<void>('connectTransport', request);
  }

  /**
   * Produce media (audio or video)
   */
  async produce(
    callId: string,
    transportId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters,
    appData?: any
  ): Promise<ProduceResponse> {
    const request: ProduceRequest = {
      callId,
      transportId,
      kind,
      rtpParameters,
      appData,
    };
    return this.emit<ProduceResponse>('produce', request);
  }

  /**
   * Consume remote media
   */
  async consume(
    callId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities
  ): Promise<ConsumeResponse> {
    const request: ConsumeRequest = {
      callId,
      transportId,
      producerId,
      rtpCapabilities,
    };
    return this.emit<ConsumeResponse>('consume', request);
  }

  /**
   * Resume a consumer to start receiving media
   */
  async resumeConsumer(callId: string, consumerId: string): Promise<void> {
    const request: ResumeConsumerRequest = { callId, consumerId };
    await this.emit<void>('resumeConsumer', request);
  }

  /**
   * Get list of available producers in the room
   */
  async getProducers(callId: string): Promise<GetProducersResponse> {
    const request: GetProducersRequest = { callId };
    return this.emit<GetProducersResponse>('getProducers', request);
  }

  /**
   * Leave a room
   */
  async leaveRoom(callId: string): Promise<void> {
    const request: LeaveRoomRequest = { callId };
    await this.emit<void>('leaveRoom', request);
  }

  /**
   * Listen for server events
   */
  on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      console.warn('[Signaling] Cannot listen to events, not connected');
      return;
    }

    this.socket.on(event, handler);
    this.eventHandlers.set(event, handler);
    console.log('[Signaling] Listening to event:', event);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof ServerToClientEvents>(event: K): void {
    if (!this.socket) {
      return;
    }

    const handler = this.eventHandlers.get(event);
    if (handler) {
      this.socket.off(event, handler);
      this.eventHandlers.delete(event);
      console.log('[Signaling] Removed listener for event:', event);
    }
  }

  /**
   * Emit event to server with callback-based response
   */
  private emit<T>(event: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to signaling server'));
        return;
      }

      console.log('[Signaling] Emitting:', event, data);

      this.socket.emit(event, data, (response: SocketResponse<T>) => {
        console.log('[Signaling] Response:', event, response);

        if (response.success && response.data !== undefined) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });
    });
  }
}

// Export singleton instance
export const signalingService = new SignalingService();

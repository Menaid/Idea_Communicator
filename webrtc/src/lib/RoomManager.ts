import * as mediasoup from 'mediasoup';
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { config } from '../config';
import {
  Room,
  Peer,
  TransportInfo,
  ProducerInfo,
  ConsumerInfo,
} from '../types/webrtc.types';

/**
 * RoomManager
 *
 * Manages WebRTC rooms, routers, peers, transports, producers, and consumers
 * for the Idea Communicator video/audio call system.
 *
 * Architecture:
 * - Each call/room has its own mediasoup Router
 * - Each peer (participant) has send/recv Transports
 * - Producers publish media (audio/video) to the router
 * - Consumers subscribe to remote producers
 */
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private peers: Map<string, Peer> = new Map(); // socketId -> Peer
  private workers: mediasoup.types.Worker[];
  private nextWorkerIdx: number = 0;

  constructor(workers: mediasoup.types.Worker[]) {
    this.workers = workers;
    logger.info('RoomManager initialized');
  }

  /**
   * Get next worker using round-robin
   */
  private getNextWorker(): mediasoup.types.Worker {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  /**
   * Create a new room with a mediasoup router
   */
  async createRoom(callId: string): Promise<Room> {
    if (this.rooms.has(callId)) {
      logger.warn(`Room ${callId} already exists`);
      return this.rooms.get(callId)!;
    }

    const worker = this.getNextWorker();
    const router = await worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs,
    });

    const room: Room = {
      id: callId,
      router,
      peers: new Map(),
      createdAt: new Date(),
    };

    this.rooms.set(callId, room);
    logger.info(`Room created: ${callId} on worker ${worker.pid}`);

    return room;
  }

  /**
   * Get or create a room
   */
  async getOrCreateRoom(callId: string): Promise<Room> {
    if (this.rooms.has(callId)) {
      return this.rooms.get(callId)!;
    }
    return this.createRoom(callId);
  }

  /**
   * Get a room by ID
   */
  getRoom(callId: string): Room | undefined {
    return this.rooms.get(callId);
  }

  /**
   * Add a peer to a room
   */
  async addPeer(
    callId: string,
    userId: string,
    socket: Socket,
    rtpCapabilities?: mediasoup.types.RtpCapabilities,
  ): Promise<Peer> {
    const room = await this.getOrCreateRoom(callId);

    const peer: Peer = {
      id: socket.id,
      userId,
      callId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      socket,
      rtpCapabilities,
    };

    room.peers.set(socket.id, peer);
    this.peers.set(socket.id, peer);

    logger.info(`Peer ${socket.id} (user ${userId}) joined room ${callId}`);

    return peer;
  }

  /**
   * Get a peer by socket ID
   */
  getPeer(socketId: string): Peer | undefined {
    return this.peers.get(socketId);
  }

  /**
   * Remove a peer from a room
   */
  async removePeer(socketId: string): Promise<void> {
    const peer = this.peers.get(socketId);
    if (!peer) {
      return;
    }

    const room = this.rooms.get(peer.callId);
    if (!room) {
      return;
    }

    // Close all transports
    for (const transport of peer.transports.values()) {
      transport.close();
    }

    // Remove peer from room
    room.peers.delete(socketId);
    this.peers.delete(socketId);

    logger.info(`Peer ${socketId} removed from room ${peer.callId}`);

    // Notify other peers that this peer left
    this.broadcastToRoom(peer.callId, 'peerLeft', { peerId: socketId, userId: peer.userId }, socketId);

    // Close room if empty
    if (room.peers.size === 0) {
      await this.closeRoom(peer.callId);
    }
  }

  /**
   * Create a WebRTC transport for a peer
   */
  async createTransport(
    peerId: string,
    direction: 'send' | 'recv',
  ): Promise<TransportInfo> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const room = this.rooms.get(peer.callId);
    if (!room) {
      throw new Error('Room not found');
    }

    const transport = await room.router.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps,
      enableUdp: config.mediasoup.webRtcTransport.enableUdp,
      enableTcp: config.mediasoup.webRtcTransport.enableTcp,
      preferUdp: config.mediasoup.webRtcTransport.preferUdp,
      initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
    });

    // Set max incoming bitrate
    if (config.mediasoup.webRtcTransport.maxIncomingBitrate) {
      await transport.setMaxIncomingBitrate(config.mediasoup.webRtcTransport.maxIncomingBitrate);
    }

    peer.transports.set(transport.id, transport);

    logger.info(`Transport created: ${transport.id} (${direction}) for peer ${peerId}`);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  /**
   * Connect a transport
   */
  async connectTransport(
    peerId: string,
    transportId: string,
    dtlsParameters: mediasoup.types.DtlsParameters,
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    await transport.connect({ dtlsParameters });
    logger.info(`Transport ${transportId} connected for peer ${peerId}`);
  }

  /**
   * Create a producer (publish media)
   */
  async produce(
    peerId: string,
    transportId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters,
    appData?: any,
  ): Promise<string> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId, userId: peer.userId },
    });

    peer.producers.set(producer.id, producer);

    logger.info(`Producer created: ${producer.id} (${kind}) for peer ${peerId}`);

    // Notify other peers about new producer
    this.broadcastToRoom(
      peer.callId,
      'newProducer',
      {
        producerId: producer.id,
        peerId,
        userId: peer.userId,
        kind,
      },
      peerId,
    );

    return producer.id;
  }

  /**
   * Create a consumer (subscribe to remote media)
   */
  async consume(
    peerId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities,
  ): Promise<ConsumerInfo> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }

    const room = this.rooms.get(peer.callId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if router can consume
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume this producer');
    }

    // Find the producer
    let producerPeer: Peer | undefined;
    for (const p of room.peers.values()) {
      if (p.producers.has(producerId)) {
        producerPeer = p;
        break;
      }
    }

    if (!producerPeer) {
      throw new Error('Producer peer not found');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, client will resume
    });

    peer.consumers.set(consumer.id, consumer);

    logger.info(`Consumer created: ${consumer.id} for peer ${peerId} consuming ${producerId}`);

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      peerId: producerPeer.id,
      userId: producerPeer.userId,
    };
  }

  /**
   * Resume a consumer
   */
  async resumeConsumer(peerId: string, consumerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error('Peer not found');
    }

    const consumer = peer.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    await consumer.resume();
    logger.info(`Consumer ${consumerId} resumed for peer ${peerId}`);
  }

  /**
   * Get all producers in a room (for a new peer to consume)
   */
  getProducers(callId: string, excludePeerId?: string): ProducerInfo[] {
    const room = this.rooms.get(callId);
    if (!room) {
      return [];
    }

    const producers: ProducerInfo[] = [];

    for (const peer of room.peers.values()) {
      if (peer.id === excludePeerId) {
        continue;
      }

      for (const producer of peer.producers.values()) {
        producers.push({
          id: producer.id,
          kind: producer.kind,
          peerId: peer.id,
          userId: peer.userId,
        });
      }
    }

    return producers;
  }

  /**
   * Get peers in a room
   */
  getPeersInRoom(callId: string): Peer[] {
    const room = this.rooms.get(callId);
    if (!room) {
      return [];
    }
    return Array.from(room.peers.values());
  }

  /**
   * Broadcast event to all peers in a room
   */
  broadcastToRoom(callId: string, event: string, data: any, excludePeerId?: string): void {
    const room = this.rooms.get(callId);
    if (!room) {
      return;
    }

    for (const peer of room.peers.values()) {
      if (peer.id !== excludePeerId) {
        peer.socket.emit(event, data);
      }
    }
  }

  /**
   * Close a room and cleanup resources
   */
  async closeRoom(callId: string): Promise<void> {
    const room = this.rooms.get(callId);
    if (!room) {
      return;
    }

    // Close all peer resources
    for (const peer of room.peers.values()) {
      for (const transport of peer.transports.values()) {
        transport.close();
      }
      this.peers.delete(peer.id);
    }

    // Close router
    room.router.close();

    this.rooms.delete(callId);
    logger.info(`Room closed: ${callId}`);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      rooms: this.rooms.size,
      peers: this.peers.size,
      workers: this.workers.length,
    };
  }
}

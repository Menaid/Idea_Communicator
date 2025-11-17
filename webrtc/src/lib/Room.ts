import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { logger } from './logger';

export interface Peer {
  id: string;
  userId: string;
  displayName: string;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
  rtpCapabilities?: mediasoupTypes.RtpCapabilities;
}

export class Room {
  id: string;
  router: mediasoupTypes.Router;
  peers: Map<string, Peer>;
  closed: boolean;

  constructor(roomId: string, router: mediasoupTypes.Router) {
    this.id = roomId;
    this.router = router;
    this.peers = new Map();
    this.closed = false;

    logger.info(`Room created: ${roomId}`);
  }

  addPeer(peerId: string, userId: string, displayName: string): Peer {
    const peer: Peer = {
      id: peerId,
      userId,
      displayName,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    this.peers.set(peerId, peer);
    logger.info(`Peer added to room ${this.id}: ${peerId} (${displayName})`);

    return peer;
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    // Close all transports
    peer.transports.forEach((transport) => {
      transport.close();
    });

    // Close all producers
    peer.producers.forEach((producer) => {
      producer.close();
    });

    // Close all consumers
    peer.consumers.forEach((consumer) => {
      consumer.close();
    });

    this.peers.delete(peerId);
    logger.info(`Peer removed from room ${this.id}: ${peerId}`);

    // Close room if empty
    if (this.peers.size === 0) {
      this.close();
    }
  }

  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId);
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  getOtherPeers(peerId: string): Peer[] {
    return this.getPeers().filter((peer) => peer.id !== peerId);
  }

  async createWebRtcTransport(
    peerId: string,
    webRtcTransportOptions: mediasoupTypes.WebRtcTransportOptions,
  ): Promise<mediasoupTypes.WebRtcTransport> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer not found: ${peerId}`);
    }

    const transport = await this.router.createWebRtcTransport(webRtcTransportOptions);
    peer.transports.set(transport.id, transport);

    logger.info(`WebRTC transport created in room ${this.id} for peer ${peerId}: ${transport.id}`);

    return transport;
  }

  async createProducer(
    peerId: string,
    transportId: string,
    rtpParameters: mediasoupTypes.RtpParameters,
    kind: mediasoupTypes.MediaKind,
    appData?: any,
  ): Promise<mediasoupTypes.Producer> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer not found: ${peerId}`);
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, peerId, transportId },
    });

    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      logger.info(`Producer transport closed: ${producer.id}`);
      producer.close();
      peer.producers.delete(producer.id);
    });

    logger.info(`Producer created in room ${this.id}: ${producer.id} (${kind})`);

    return producer;
  }

  async createConsumer(
    peerId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoupTypes.RtpCapabilities,
  ): Promise<mediasoupTypes.Consumer> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer not found: ${peerId}`);
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport not found: ${transportId}`);
    }

    // Check if router can consume
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Cannot consume producer ${producerId}`);
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Start paused, resume after client is ready
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      logger.info(`Consumer transport closed: ${consumer.id}`);
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      logger.info(`Consumer producer closed: ${consumer.id}`);
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    logger.info(`Consumer created in room ${this.id}: ${consumer.id}`);

    return consumer;
  }

  closeProducer(peerId: string, producerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    const producer = peer.producers.get(producerId);
    if (!producer) return;

    producer.close();
    peer.producers.delete(producerId);

    logger.info(`Producer closed in room ${this.id}: ${producerId}`);
  }

  close(): void {
    if (this.closed) return;

    this.closed = true;

    // Close all peers
    this.peers.forEach((peer) => {
      peer.transports.forEach((transport) => transport.close());
      peer.producers.forEach((producer) => producer.close());
      peer.consumers.forEach((consumer) => consumer.close());
    });

    this.peers.clear();

    // Close router
    this.router.close();

    logger.info(`Room closed: ${this.id}`);
  }
}

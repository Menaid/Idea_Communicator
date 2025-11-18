import { Device } from 'mediasoup-client';
import * as mediasoup from 'mediasoup-client';
import type { TransportInfo } from '../types/webrtc.types';

/**
 * WebRTC Service
 * Manages mediasoup Device, Transports, Producers, and Consumers
 */
class WebRTCService {
  private device: Device | null = null;
  private sendTransport: mediasoup.types.Transport | null = null;
  private recvTransport: mediasoup.types.Transport | null = null;
  private producers: Map<string, mediasoup.types.Producer> = new Map();
  private consumers: Map<string, mediasoup.types.Consumer> = new Map();

  /**
   * Initialize mediasoup Device with router RTP capabilities
   */
  async loadDevice(routerRtpCapabilities: mediasoup.types.RtpCapabilities): Promise<void> {
    try {
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
      console.log('[WebRTC] Device loaded successfully', {
        handlerName: this.device.handlerName,
      });
    } catch (error) {
      console.error('[WebRTC] Failed to load device:', error);
      throw error;
    }
  }

  /**
   * Get the mediasoup Device instance
   */
  getDevice(): Device | null {
    return this.device;
  }

  /**
   * Get RTP capabilities of the device
   */
  getRtpCapabilities(): mediasoup.types.RtpCapabilities | undefined {
    return this.device?.rtpCapabilities;
  }

  /**
   * Check if device is loaded
   */
  isDeviceLoaded(): boolean {
    return this.device !== null && this.device.loaded;
  }

  /**
   * Create send transport
   */
  async createSendTransport(
    transportInfo: TransportInfo,
    onProduce: (kind: mediasoup.types.MediaKind, rtpParameters: mediasoup.types.RtpParameters, appData?: any) => Promise<string>
  ): Promise<mediasoup.types.Transport> {
    if (!this.device) {
      throw new Error('Device not loaded');
    }

    try {
      this.sendTransport = this.device.createSendTransport({
        id: transportInfo.id,
        iceParameters: transportInfo.iceParameters,
        iceCandidates: transportInfo.iceCandidates,
        dtlsParameters: transportInfo.dtlsParameters,
      });

      // Handle 'connect' event
      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('[WebRTC] Send transport connecting...');
          // This will be handled by the signaling service
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });

      // Handle 'produce' event
      this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          console.log('[WebRTC] Producing:', kind);
          const producerId = await onProduce(kind, rtpParameters, appData);
          callback({ id: producerId });
        } catch (error) {
          console.error('[WebRTC] Produce error:', error);
          errback(error as Error);
        }
      });

      // Handle 'connectionstatechange' event
      this.sendTransport.on('connectionstatechange', (state) => {
        console.log('[WebRTC] Send transport connection state:', state);
        if (state === 'failed' || state === 'closed') {
          console.warn('[WebRTC] Send transport failed or closed');
        }
      });

      console.log('[WebRTC] Send transport created');
      return this.sendTransport;
    } catch (error) {
      console.error('[WebRTC] Failed to create send transport:', error);
      throw error;
    }
  }

  /**
   * Create receive transport
   */
  async createRecvTransport(transportInfo: TransportInfo): Promise<mediasoup.types.Transport> {
    if (!this.device) {
      throw new Error('Device not loaded');
    }

    try {
      this.recvTransport = this.device.createRecvTransport({
        id: transportInfo.id,
        iceParameters: transportInfo.iceParameters,
        iceCandidates: transportInfo.iceCandidates,
        dtlsParameters: transportInfo.dtlsParameters,
      });

      // Handle 'connect' event
      this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('[WebRTC] Recv transport connecting...');
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });

      // Handle 'connectionstatechange' event
      this.recvTransport.on('connectionstatechange', (state) => {
        console.log('[WebRTC] Recv transport connection state:', state);
        if (state === 'failed' || state === 'closed') {
          console.warn('[WebRTC] Recv transport failed or closed');
        }
      });

      console.log('[WebRTC] Recv transport created');
      return this.recvTransport;
    } catch (error) {
      console.error('[WebRTC] Failed to create recv transport:', error);
      throw error;
    }
  }

  /**
   * Get send transport
   */
  getSendTransport(): mediasoup.types.Transport | null {
    return this.sendTransport;
  }

  /**
   * Get receive transport
   */
  getRecvTransport(): mediasoup.types.Transport | null {
    return this.recvTransport;
  }

  /**
   * Produce media (audio or video)
   */
  async produce(
    track: MediaStreamTrack,
    appData?: any
  ): Promise<mediasoup.types.Producer> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    try {
      const producer = await this.sendTransport.produce({
        track,
        appData,
      });

      this.producers.set(producer.id, producer);

      producer.on('trackended', () => {
        console.log('[WebRTC] Producer track ended:', producer.id);
      });

      producer.on('transportclose', () => {
        console.log('[WebRTC] Producer transport closed:', producer.id);
        this.producers.delete(producer.id);
      });

      console.log('[WebRTC] Producer created:', {
        id: producer.id,
        kind: producer.kind,
      });

      return producer;
    } catch (error) {
      console.error('[WebRTC] Failed to produce:', error);
      throw error;
    }
  }

  /**
   * Consume remote media
   */
  async consume(
    consumerId: string,
    producerId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters
  ): Promise<mediasoup.types.Consumer> {
    if (!this.recvTransport) {
      throw new Error('Receive transport not created');
    }

    try {
      const consumer = await this.recvTransport.consume({
        id: consumerId,
        producerId,
        kind,
        rtpParameters,
      });

      this.consumers.set(consumer.id, consumer);

      consumer.on('trackended', () => {
        console.log('[WebRTC] Consumer track ended:', consumer.id);
      });

      consumer.on('transportclose', () => {
        console.log('[WebRTC] Consumer transport closed:', consumer.id);
        this.consumers.delete(consumer.id);
      });

      console.log('[WebRTC] Consumer created:', {
        id: consumer.id,
        kind: consumer.kind,
      });

      return consumer;
    } catch (error) {
      console.error('[WebRTC] Failed to consume:', error);
      throw error;
    }
  }

  /**
   * Get a producer by ID
   */
  getProducer(id: string): mediasoup.types.Producer | undefined {
    return this.producers.get(id);
  }

  /**
   * Get a consumer by ID
   */
  getConsumer(id: string): mediasoup.types.Consumer | undefined {
    return this.consumers.get(id);
  }

  /**
   * Close a producer
   */
  closeProducer(id: string): void {
    const producer = this.producers.get(id);
    if (producer) {
      producer.close();
      this.producers.delete(id);
      console.log('[WebRTC] Producer closed:', id);
    }
  }

  /**
   * Close a consumer
   */
  closeConsumer(id: string): void {
    const consumer = this.consumers.get(id);
    if (consumer) {
      consumer.close();
      this.consumers.delete(id);
      console.log('[WebRTC] Consumer closed:', id);
    }
  }

  /**
   * Get all producers
   */
  getProducers(): Map<string, mediasoup.types.Producer> {
    return this.producers;
  }

  /**
   * Get all consumers
   */
  getConsumers(): Map<string, mediasoup.types.Consumer> {
    return this.consumers;
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    console.log('[WebRTC] Cleaning up resources...');

    // Close all producers
    this.producers.forEach((producer) => producer.close());
    this.producers.clear();

    // Close all consumers
    this.consumers.forEach((consumer) => consumer.close());
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Reset device
    this.device = null;

    console.log('[WebRTC] Cleanup complete');
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();

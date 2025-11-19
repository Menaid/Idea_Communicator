import { useState, useEffect, useCallback, useRef } from 'react';
import { webrtcService } from '../services/webrtc.service';
import { signalingService } from '../services/signaling.service';
import type { RemoteParticipant, ProducerInfo } from '../types/webrtc.types';

export interface UseWebRTCProps {
  callId: string;
  userId: string;
  enabled?: boolean;
}

export interface UseWebRTCReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;

  // Participants
  localStream: MediaStream | null;
  remoteParticipants: Map<string, RemoteParticipant>;

  // Actions
  publishStream: (stream: MediaStream) => Promise<void>;
  unpublishStream: () => Promise<void>;
  subscribeToProducer: (producerId: string, peerId: string, userId: string) => Promise<void>;
  unsubscribeFromProducer: (consumerId: string) => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * useWebRTC Hook
 * Main hook for managing WebRTC connection and media
 */
export function useWebRTC({ callId, userId, enabled = true }: UseWebRTCProps): UseWebRTCReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(
    new Map()
  );

  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const mountedRef = useRef(true);

  /**
   * Initialize WebRTC connection
   */
  const initialize = useCallback(async () => {
    if (!enabled || isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('[useWebRTC] Initializing connection for call:', callId);

      // 1. Connect to signaling server
      await signalingService.connect();

      // 2. Create/join room
      const { rtpCapabilities } = await signalingService.createRoom(callId);
      console.log('[useWebRTC] Room created, RTP capabilities received');

      // 3. Load mediasoup Device
      await webrtcService.loadDevice(rtpCapabilities);
      console.log('[useWebRTC] Device loaded');

      // 4. Join room as peer
      const { peers } = await signalingService.joinRoom(
        callId,
        userId,
        webrtcService.getRtpCapabilities()!
      );
      console.log('[useWebRTC] Joined room, existing peers:', peers.length);

      // 5. Create send transport
      const sendTransportInfo = await signalingService.createTransport(callId, 'send');
      const sendTransport = await webrtcService.createSendTransport(
        sendTransportInfo.transport,
        async (kind, rtpParameters, appData) => {
          // This callback is called when producing
          const { id } = await signalingService.produce(
            callId,
            sendTransportInfo.transport.id,
            kind,
            rtpParameters,
            appData
          );
          return id;
        }
      );

      // Connect send transport
      sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await signalingService.connectTransport(
            callId,
            sendTransportInfo.transport.id,
            dtlsParameters
          );
          callback();
        } catch (err) {
          errback(err as Error);
        }
      });

      sendTransportRef.current = sendTransport;
      console.log('[useWebRTC] Send transport created');

      // 6. Create receive transport
      const recvTransportInfo = await signalingService.createTransport(callId, 'recv');
      const recvTransport = await webrtcService.createRecvTransport(recvTransportInfo.transport);

      // Connect recv transport
      recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await signalingService.connectTransport(
            callId,
            recvTransportInfo.transport.id,
            dtlsParameters
          );
          callback();
        } catch (err) {
          errback(err as Error);
        }
      });

      recvTransportRef.current = recvTransport;
      console.log('[useWebRTC] Receive transport created');

      // 7. Subscribe to existing producers
      const { producers } = await signalingService.getProducers(callId);
      console.log('[useWebRTC] Existing producers:', producers.length);

      for (const producer of producers) {
        await subscribeToProducerInternal(producer);
      }

      // 8. Listen for new producers
      signalingService.on('newProducer', async ({ producerId, peerId, userId: producerUserId, kind }) => {
        console.log('[useWebRTC] New producer:', { producerId, peerId, kind });
        await subscribeToProducerInternal({ id: producerId, peerId, userId: producerUserId, kind });
      });

      // 9. Listen for peer closed
      signalingService.on('peerClosed', ({ peerId }) => {
        console.log('[useWebRTC] Peer closed:', peerId);
        setRemoteParticipants((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      });

      // 10. Listen for producer closed
      signalingService.on('producerClosed', ({ producerId, peerId }) => {
        console.log('[useWebRTC] Producer closed:', { producerId, peerId });
        // Remove consumer for this producer
        setRemoteParticipants((prev) => {
          const participant = prev.get(peerId);
          if (participant) {
            // Remove track from stream
            const consumer = webrtcService.getConsumer(producerId);
            if (consumer) {
              participant.stream.removeTrack(consumer.track);
              webrtcService.closeConsumer(consumer.id);
            }
          }
          return new Map(prev);
        });
      });

      if (mountedRef.current) {
        console.log('[useWebRTC] Setting isConnected=true, isConnecting=false');
        setIsConnected(true);
        setIsConnecting(false);
      }

      console.log('[useWebRTC] Connection established successfully');
    } catch (err) {
      console.error('[useWebRTC] Initialization error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsConnecting(false);
      }
    }
  }, [callId, userId, enabled, isConnecting, isConnected]);

  /**
   * Subscribe to a producer (internal)
   */
  const subscribeToProducerInternal = async (producer: ProducerInfo) => {
    try {
      const rtpCapabilities = webrtcService.getRtpCapabilities();
      if (!rtpCapabilities) {
        throw new Error('Device not loaded');
      }

      const recvTransport = recvTransportRef.current;
      if (!recvTransport) {
        throw new Error('Receive transport not created');
      }

      console.log('[useWebRTC] Subscribing to producer:', producer.id);

      const { consumer: consumerInfo } = await signalingService.consume(
        callId,
        recvTransport.id,
        producer.id,
        rtpCapabilities
      );

      const consumer = await webrtcService.consume(
        consumerInfo.id,
        consumerInfo.producerId,
        consumerInfo.kind,
        consumerInfo.rtpParameters
      );

      // Resume consumer
      await signalingService.resumeConsumer(callId, consumer.id);

      // Add track to remote participant's stream
      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        let participant = next.get(producer.peerId);

        if (!participant) {
          // Create new participant
          participant = {
            peerId: producer.peerId,
            userId: producer.userId,
            stream: new MediaStream(),
            audioConsumerId: null,
            videoConsumerId: null,
          };
        }

        // Add track to stream
        participant.stream.addTrack(consumer.track);

        // Update consumer ID
        if (consumer.kind === 'audio') {
          participant.audioConsumerId = consumer.id;
        } else {
          participant.videoConsumerId = consumer.id;
        }

        next.set(producer.peerId, participant);
        return next;
      });

      console.log('[useWebRTC] Subscribed to producer:', producer.id);
    } catch (err) {
      console.error('[useWebRTC] Subscribe error:', err);
    }
  };

  /**
   * Publish local media stream
   */
  const publishStream = useCallback(
    async (stream: MediaStream) => {
      try {
        console.log('[useWebRTC] Publishing stream, tracks:', stream.getTracks().length);

        const tracks = stream.getTracks();
        for (const track of tracks) {
          await webrtcService.produce(track);
          console.log('[useWebRTC] Produced track:', track.kind);
        }

        setLocalStream(stream);
        console.log('[useWebRTC] Stream published successfully');
      } catch (err) {
        console.error('[useWebRTC] Publish error:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Unpublish local media stream
   */
  const unpublishStream = useCallback(async () => {
    try {
      console.log('[useWebRTC] Unpublishing stream');

      // Close all producers
      const producers = webrtcService.getProducers();
      producers.forEach((producer) => {
        webrtcService.closeProducer(producer.id);
      });

      // Stop local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      console.log('[useWebRTC] Stream unpublished');
    } catch (err) {
      console.error('[useWebRTC] Unpublish error:', err);
    }
  }, [localStream]);

  /**
   * Subscribe to a remote producer
   */
  const subscribeToProducer = useCallback(
    async (producerId: string, peerId: string, producerUserId: string) => {
      await subscribeToProducerInternal({
        id: producerId,
        peerId,
        userId: producerUserId,
        kind: 'video', // Will be determined by the server
      });
    },
    [callId]
  );

  /**
   * Unsubscribe from a remote producer
   */
  const unsubscribeFromProducer = useCallback(async (consumerId: string) => {
    try {
      console.log('[useWebRTC] Unsubscribing from consumer:', consumerId);
      webrtcService.closeConsumer(consumerId);
    } catch (err) {
      console.error('[useWebRTC] Unsubscribe error:', err);
    }
  }, []);

  /**
   * Leave the call
   */
  const leave = useCallback(async () => {
    try {
      console.log('[useWebRTC] Leaving call');

      // Unpublish stream
      await unpublishStream();

      // Leave room
      await signalingService.leaveRoom(callId);

      // Cleanup
      webrtcService.cleanup();
      signalingService.disconnect();

      setIsConnected(false);
      setRemoteParticipants(new Map());

      console.log('[useWebRTC] Left call successfully');
    } catch (err) {
      console.error('[useWebRTC] Leave error:', err);
    }
  }, [callId, unpublishStream]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (enabled) {
      initialize();
    }

    // Cleanup ONLY on unmount, not on dependency changes
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, initialize]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isConnected) {
        leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    localStream,
    remoteParticipants,
    publishStream,
    unpublishStream,
    subscribeToProducer,
    unsubscribeFromProducer,
    leave,
  };
}

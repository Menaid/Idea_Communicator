import { useState, useEffect, useCallback } from 'react';

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface UseMediaDevicesReturn {
  // Devices
  devices: MediaDevice[];
  audioInputDevices: MediaDevice[];
  videoInputDevices: MediaDevice[];

  // Selected devices
  selectedAudioDevice: string;
  selectedVideoDevice: string;

  // Actions
  setSelectedAudioDevice: (deviceId: string) => void;
  setSelectedVideoDevice: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;

  // Get media stream
  getMediaStream: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  getDisplayMedia: () => Promise<MediaStream>;

  // State
  isLoading: boolean;
  error: Error | null;
}

/**
 * useMediaDevices Hook
 * Manages media devices (cameras, microphones) and media streams
 */
export function useMediaDevices(): UseMediaDevicesReturn {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load available media devices
   */
  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      // Get device list
      const deviceList = await navigator.mediaDevices.enumerateDevices();

      const mediaDevices: MediaDevice[] = deviceList
        .filter((device) => device.kind === 'audioinput' || device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind,
        }));

      setDevices(mediaDevices);

      // Set default devices if not already set
      if (!selectedAudioDevice) {
        const defaultAudio = mediaDevices.find((d) => d.kind === 'audioinput');
        if (defaultAudio) {
          setSelectedAudioDevice(defaultAudio.deviceId);
        }
      }

      if (!selectedVideoDevice) {
        const defaultVideo = mediaDevices.find((d) => d.kind === 'videoinput');
        if (defaultVideo) {
          setSelectedVideoDevice(defaultVideo.deviceId);
        }
      }

      // Stop the permission stream
      stream.getTracks().forEach((track) => track.stop());

      console.log('[useMediaDevices] Loaded devices:', mediaDevices.length);
    } catch (err) {
      console.error('[useMediaDevices] Failed to load devices:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAudioDevice, selectedVideoDevice]);

  /**
   * Refresh device list
   */
  const refreshDevices = useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  /**
   * Get user media stream with selected devices
   */
  const getMediaStream = useCallback(
    async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
      try {
        const defaultConstraints: MediaStreamConstraints = {
          audio: selectedAudioDevice
            ? { deviceId: { exact: selectedAudioDevice } }
            : true,
          video: selectedVideoDevice
            ? {
                deviceId: { exact: selectedVideoDevice },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
        };

        const finalConstraints = constraints || defaultConstraints;

        console.log('[useMediaDevices] Getting media stream:', finalConstraints);

        const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

        console.log('[useMediaDevices] Media stream acquired:', {
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
        });

        return stream;
      } catch (err) {
        console.error('[useMediaDevices] Failed to get media stream:', err);
        throw err;
      }
    },
    [selectedAudioDevice, selectedVideoDevice]
  );

  /**
   * Get display media (screen share)
   */
  const getDisplayMedia = useCallback(async (): Promise<MediaStream> => {
    try {
      console.log('[useMediaDevices] Getting display media');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      console.log('[useMediaDevices] Display media acquired');

      return stream;
    } catch (err) {
      console.error('[useMediaDevices] Failed to get display media:', err);
      throw err;
    }
  }, []);

  /**
   * Filter devices by kind
   */
  const audioInputDevices = devices.filter((d) => d.kind === 'audioinput');
  const videoInputDevices = devices.filter((d) => d.kind === 'videoinput');

  /**
   * Load devices on mount
   */
  useEffect(() => {
    loadDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('[useMediaDevices] Devices changed');
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  return {
    devices,
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    refreshDevices,
    getMediaStream,
    getDisplayMedia,
    isLoading,
    error,
  };
}

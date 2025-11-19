import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import { useCallState } from '../../hooks/useCallState';
import { VideoGrid } from './VideoGrid';
import { VideoControls } from './VideoControls';
import { DeviceSelector } from './DeviceSelector';

export interface VideoCallProps {
  callId: string;
  userId: string;
  userName: string;
  participantNames?: Map<string, string>; // userId -> name
  onLeave?: () => void;
}

/**
 * VideoCall Component
 * Main component for video calling with WebRTC
 */
export function VideoCall({
  callId,
  userId,
  userName,
  participantNames = new Map(),
  onLeave,
}: VideoCallProps) {
  // Hooks
  const {
    isConnected,
    isConnecting,
    error,
    localStream,
    remoteParticipants,
    publishStream,
    unpublishStream,
    leave,
  } = useWebRTC({ callId, userId, enabled: true });

  const {
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    getMediaStream,
    getDisplayMedia,
  } = useMediaDevices();

  const {
    isMuted,
    toggleMute,
    setMuted,
    isVideoOff,
    toggleVideo,
    setVideoOff,
    isScreenSharing,
    toggleScreenShare,
    setScreenSharing,
  } = useCallState();

  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

  // Use ref to track current stream so cleanup always has latest value
  const currentStreamRef = useRef<MediaStream | null>(null);

  // Update ref whenever stream changes
  useEffect(() => {
    currentStreamRef.current = currentStream;
  }, [currentStream]);

  /**
   * Cleanup on unmount - IMPORTANT: This ensures call is properly left
   * even if user navigates away without clicking "Leave Call"
   */
  useEffect(() => {
    return () => {
      console.log('[VideoCall] Component unmounting, cleaning up...');

      // Stop all media tracks using ref (always has latest stream)
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => {
          console.log('[VideoCall] Stopping track on unmount:', track.kind, track.id);
          track.stop();
        });
      }

      // Leave WebRTC session
      leave();

      console.log('[VideoCall] Unmount cleanup completed');
    };
  }, [leave]); // Only depends on leave function

  /**
   * Initialize media stream
   */
  useEffect(() => {
    const initMedia = async () => {
      if (isConnected && !currentStream) {
        try {
          console.log('[VideoCall] Acquiring media stream...');
          const stream = await getMediaStream();
          console.log('[VideoCall] Media stream acquired, publishing...');
          setCurrentStream(stream);
          await publishStream(stream);
          console.log('[VideoCall] Stream published successfully');
        } catch (err) {
          console.error('[VideoCall] Failed to get media stream:', err);
        }
      }
    };

    initMedia();
  }, [isConnected, currentStream, getMediaStream, publishStream]);

  /**
   * Handle mute toggle
   */
  const handleToggleMute = () => {
    if (currentStream) {
      const audioTrack = currentStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleMute();
      }
    }
  };

  /**
   * Handle video toggle
   */
  const handleToggleVideo = () => {
    if (currentStream) {
      const videoTrack = currentStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleVideo();
      }
    }
  };

  /**
   * Handle screen share toggle
   */
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing, go back to camera
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }

      await unpublishStream();

      try {
        const stream = await getMediaStream();
        setCurrentStream(stream);
        await publishStream(stream);
        setScreenSharing(false);
      } catch (err) {
        console.error('[VideoCall] Failed to restart camera:', err);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await getDisplayMedia();

        // Stop current stream
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }

        await unpublishStream();

        // Add audio from current stream if unmuted
        if (!isMuted && currentStream) {
          const audioTrack = currentStream.getAudioTracks()[0];
          if (audioTrack) {
            screenStream.addTrack(audioTrack);
          }
        }

        setCurrentStream(screenStream);
        await publishStream(screenStream);
        setScreenSharing(true);

        // Listen for screen share stop (user clicked "Stop Sharing" in browser)
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          handleToggleScreenShare(); // This will stop screen sharing and go back to camera
        });
      } catch (err) {
        console.error('[VideoCall] Failed to start screen sharing:', err);
      }
    }
  };

  /**
   * Handle leaving the call
   */
  const handleLeave = async () => {
    console.log('[VideoCall] handleLeave called');

    // Stop all media tracks
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        console.log('[VideoCall] Stopping track:', track.kind, track.id);
        track.stop();
      });
      setCurrentStream(null);
    }

    // Leave WebRTC session
    await leave();

    // Call parent callback to exit call UI
    if (onLeave) {
      onLeave();
    }

    console.log('[VideoCall] handleLeave completed');
  };

  /**
   * Handle device change
   */
  const handleDeviceChange = async (type: 'audio' | 'video', deviceId: string) => {
    console.log(`[VideoCall] Changing ${type} device to:`, deviceId);

    if (type === 'audio') {
      setSelectedAudioDevice(deviceId);
    } else {
      setSelectedVideoDevice(deviceId);
    }

    // Restart stream with new device
    if (currentStream && !isScreenSharing) {
      console.log('[VideoCall] Stopping current stream for device change');

      // Stop current stream
      currentStream.getTracks().forEach((track) => {
        console.log(`[VideoCall] Stopping ${track.kind} track`);
        track.stop();
      });

      // Unpublish current stream (closes producers on server)
      await unpublishStream();

      try {
        // IMPORTANT: Pass constraints directly to use the NEW device
        // (state updates are async, so we can't rely on selectedAudioDevice/selectedVideoDevice being updated yet)
        const constraints: MediaStreamConstraints = {
          audio: type === 'audio'
            ? { deviceId: { exact: deviceId } }
            : selectedAudioDevice
              ? { deviceId: { exact: selectedAudioDevice } }
              : true,
          video: type === 'video'
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : selectedVideoDevice
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

        console.log('[VideoCall] Getting new stream with constraints:', constraints);
        const stream = await getMediaStream(constraints);

        console.log('[VideoCall] New stream acquired, publishing...');
        setCurrentStream(stream);
        await publishStream(stream);

        console.log('[VideoCall] Device change complete');
      } catch (err) {
        console.error('[VideoCall] Failed to restart stream with new device:', err);
        toast.error('Failed to change device. Please try again.');
      }
    }
  };

  // Debug logging
  console.log('[VideoCall] Render state:', {
    isConnecting,
    isConnected,
    hasCurrentStream: !!currentStream,
    hasError: !!error,
  });

  // Loading state
  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white text-lg mb-8">Connecting to call...</p>
          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="bg-red-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Connection Failed</h2>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <button
            onClick={handleLeave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main call view
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">
      {/* Video Grid */}
      <VideoGrid
        localStream={currentStream}
        localUserId={userId}
        localUserName={userName}
        remoteParticipants={remoteParticipants}
        participantNames={participantNames}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
      />

      {/* Video Controls */}
      <VideoControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onLeave={handleLeave}
        onOpenSettings={() => setShowDeviceSelector(true)}
      />

      {/* Device Selector Modal */}
      {showDeviceSelector && (
        <DeviceSelector
          audioDevices={audioInputDevices}
          videoDevices={videoInputDevices}
          selectedAudioDevice={selectedAudioDevice}
          selectedVideoDevice={selectedVideoDevice}
          onSelectAudioDevice={(deviceId) => handleDeviceChange('audio', deviceId)}
          onSelectVideoDevice={(deviceId) => handleDeviceChange('video', deviceId)}
          onClose={() => setShowDeviceSelector(false)}
        />
      )}
    </div>
  );
}

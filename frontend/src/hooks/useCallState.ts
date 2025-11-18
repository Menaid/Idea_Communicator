import { useState, useCallback } from 'react';

export interface UseCallStateReturn {
  // Audio state
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;

  // Video state
  isVideoOff: boolean;
  toggleVideo: () => void;
  setVideoOff: (off: boolean) => void;

  // Screen sharing state
  isScreenSharing: boolean;
  toggleScreenShare: () => void;
  setScreenSharing: (sharing: boolean) => void;

  // Call state
  isInCall: boolean;
  setInCall: (inCall: boolean) => void;
}

/**
 * useCallState Hook
 * Manages call state (mute, video, screen share)
 */
export function useCallState(): UseCallStateReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      console.log('[useCallState] Toggle mute:', !prev);
      return !prev;
    });
  }, []);

  /**
   * Set muted state
   */
  const setMuted = useCallback((muted: boolean) => {
    console.log('[useCallState] Set muted:', muted);
    setIsMuted(muted);
  }, []);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      console.log('[useCallState] Toggle video off:', !prev);
      return !prev;
    });
  }, []);

  /**
   * Set video off state
   */
  const setVideoOff = useCallback((off: boolean) => {
    console.log('[useCallState] Set video off:', off);
    setIsVideoOff(off);
  }, []);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(() => {
    setIsScreenSharing((prev) => {
      console.log('[useCallState] Toggle screen share:', !prev);
      return !prev;
    });
  }, []);

  /**
   * Set screen sharing state
   */
  const setScreenSharing = useCallback((sharing: boolean) => {
    console.log('[useCallState] Set screen sharing:', sharing);
    setIsScreenSharing(sharing);
  }, []);

  /**
   * Set in call state
   */
  const setInCall = useCallback((inCall: boolean) => {
    console.log('[useCallState] Set in call:', inCall);
    setIsInCall(inCall);
  }, []);

  return {
    isMuted,
    toggleMute,
    setMuted,
    isVideoOff,
    toggleVideo,
    setVideoOff,
    isScreenSharing,
    toggleScreenShare,
    setScreenSharing,
    isInCall,
    setInCall,
  };
}

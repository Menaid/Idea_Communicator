import React, { useEffect, useRef } from 'react';

export interface ParticipantVideoProps {
  stream: MediaStream | null;
  name: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
}

/**
 * ParticipantVideo Component
 * Displays video for a single participant
 */
export function ParticipantVideo({
  stream,
  name,
  isMuted = false,
  isVideoOff = false,
  isLocal = false,
  isScreenShare = false,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Video element */}
      {!isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Local video should be muted to avoid echo
          className="w-full h-full object-cover"
        />
      ) : (
        // Video off - show placeholder
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl font-semibold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white font-medium">{name}</p>
          </div>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 px-3 py-1 rounded-md">
        <p className="text-white text-sm font-medium flex items-center gap-2">
          {name}
          {isLocal && <span className="text-xs text-gray-300">(You)</span>}
          {isScreenShare && <span className="text-xs text-blue-300">(Screen)</span>}
        </p>
      </div>

      {/* Mute indicator */}
      {isMuted && (
        <div className="absolute top-3 right-3 bg-red-600 bg-opacity-80 p-2 rounded-full">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </div>
      )}

      {/* Video off indicator */}
      {isVideoOff && (
        <div className="absolute top-3 left-3 bg-gray-700 bg-opacity-80 p-2 rounded-full">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </div>
      )}
    </div>
  );
}

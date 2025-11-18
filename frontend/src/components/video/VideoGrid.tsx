import React from 'react';
import { ParticipantVideo } from './ParticipantVideo';
import type { RemoteParticipant } from '../../types/webrtc.types';

export interface VideoGridProps {
  localStream: MediaStream | null;
  localUserId: string;
  localUserName: string;
  remoteParticipants: Map<string, RemoteParticipant>;
  participantNames: Map<string, string>; // userId -> name
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

/**
 * VideoGrid Component
 * Displays a grid of participant videos
 */
export function VideoGrid({
  localStream,
  localUserId,
  localUserName,
  remoteParticipants,
  participantNames,
  isMuted,
  isVideoOff,
  isScreenSharing,
}: VideoGridProps) {
  const totalParticipants = 1 + remoteParticipants.size; // Local + remote

  /**
   * Get grid layout class based on participant count
   */
  const getGridClass = () => {
    if (totalParticipants === 1) {
      return 'grid-cols-1';
    } else if (totalParticipants === 2) {
      return 'grid-cols-2';
    } else if (totalParticipants <= 4) {
      return 'grid-cols-2 grid-rows-2';
    } else if (totalParticipants <= 9) {
      return 'grid-cols-3 grid-rows-3';
    } else {
      return 'grid-cols-4 grid-rows-4';
    }
  };

  /**
   * Get participant video height
   */
  const getVideoHeight = () => {
    if (totalParticipants === 1) {
      return 'h-full';
    } else if (totalParticipants === 2) {
      return 'h-full';
    } else if (totalParticipants <= 4) {
      return 'h-[calc(50vh-2rem)]';
    } else if (totalParticipants <= 9) {
      return 'h-[calc(33.33vh-2rem)]';
    } else {
      return 'h-[calc(25vh-2rem)]';
    }
  };

  return (
    <div className="flex-1 w-full h-full p-4 overflow-auto bg-gray-950">
      <div className={`grid ${getGridClass()} gap-4 w-full h-full`}>
        {/* Local participant */}
        <div className={`${getVideoHeight()} min-h-[200px]`}>
          <ParticipantVideo
            stream={localStream}
            name={localUserName}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isLocal={true}
            isScreenShare={isScreenSharing}
          />
        </div>

        {/* Remote participants */}
        {Array.from(remoteParticipants.entries()).map(([peerId, participant]) => {
          const userName = participantNames.get(participant.userId) || 'Unknown User';

          return (
            <div key={peerId} className={`${getVideoHeight()} min-h-[200px]`}>
              <ParticipantVideo
                stream={participant.stream}
                name={userName}
                isMuted={false} // We don't track remote mute state in this simple implementation
                isVideoOff={participant.stream.getVideoTracks().length === 0}
                isLocal={false}
              />
            </div>
          );
        })}
      </div>

      {/* Participant count badge */}
      <div className="fixed top-6 left-6 bg-black bg-opacity-60 px-4 py-2 rounded-lg">
        <p className="text-white text-sm font-medium">
          {totalParticipants} {totalParticipants === 1 ? 'participant' : 'participants'}
        </p>
      </div>
    </div>
  );
}

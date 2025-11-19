import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';
import { groupsService } from '../services/groups.service';

interface PendingCall {
  callId: string;
  groupId: string;
  initiatedBy: string;
  type: string;
  timestamp: Date;
}

interface CallNotificationContextType {
  pendingCall: PendingCall | null;
  clearPendingCall: () => void;
}

const CallNotificationContext = createContext<CallNotificationContextType | undefined>(undefined);

export function CallNotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [groups, setGroups] = useState<any[]>([]);

  // Load user's groups
  useEffect(() => {
    if (isAuthenticated) {
      const loadGroups = async () => {
        try {
          const userGroups = await groupsService.getAll();
          setGroups(userGroups);
        } catch (error) {
          console.error('[CallNotification] Error loading groups:', error);
        }
      };
      loadGroups();
    }
  }, [isAuthenticated]);

  // Listen for incoming call notifications
  useEffect(() => {
    if (!socket || !isConnected || !user) {
      return;
    }

    const handleIncomingCall = (data: PendingCall) => {
      console.log('[CallNotification] Incoming call:', data);

      // Don't show notification if user initiated the call
      if (data.initiatedBy === user.id) {
        console.log('[CallNotification] Ignoring - user is initiator');
        return;
      }

      // Get group name
      const group = groups.find(g => g.id === data.groupId);
      const groupName = group?.name || 'a group';

      console.log('[CallNotification] Showing notification for group:', groupName);

      // Store pending call info
      setPendingCall(data);

      // Show toast notification
      toast((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-semibold">📞 Incoming Call</span>
          <span className="text-sm">Someone started a call in {groupName}</span>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                console.log('[CallNotification] User clicked Join');
                toast.dismiss(t.id);
                // Navigate to chat page with group selected
                navigate(`/chat?groupId=${data.groupId}&autoJoinCall=true`);
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
            >
              Join Call
            </button>
            <button
              onClick={() => {
                console.log('[CallNotification] User dismissed notification');
                toast.dismiss(t.id);
                setPendingCall(null);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      ), {
        duration: 15000,
        position: 'top-center',
      });
    };

    socket.on('call:incoming', handleIncomingCall);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [socket, isConnected, user, groups, navigate]);

  const clearPendingCall = () => {
    setPendingCall(null);
  };

  return (
    <CallNotificationContext.Provider value={{ pendingCall, clearPendingCall }}>
      {children}
    </CallNotificationContext.Provider>
  );
}

export function useCallNotification() {
  const context = useContext(CallNotificationContext);
  if (context === undefined) {
    throw new Error('useCallNotification must be used within a CallNotificationProvider');
  }
  return context;
}

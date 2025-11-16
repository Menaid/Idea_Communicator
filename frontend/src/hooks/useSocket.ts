import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { authService } from '../services/auth.service';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = authService.getAccessToken();

    if (!token) {
      return;
    }

    // Create socket connection
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
  };
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { sound } from '../utils/audio';

interface SocketContextType {
  socket: Socket | null;
  adminWarningMessage: string | null;
  dismissAdminWarning: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, setDeviceApproved, updateTeamProfile } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [adminWarningMessage, setAdminWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection (direct backend URL when in production to support persistent websockets)
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5050'
        : 'https://treasurehunt-95y2.onrender.com');

    const newSocket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    // Participant device status push
    newSocket.on('device:status', (data: { approved: boolean; message: string }) => {
      setDeviceApproved(data.approved);
      if (data.approved) {
        sound.playUnlock();
      } else {
        sound.playError();
      }
    });

    // Game Master direct warning modal push
    newSocket.on('admin:warning', (data: { message: string }) => {
      sound.playWarning();
      setAdminWarningMessage(data.message);
    });

    // Team suspension toggle push
    newSocket.on('team:suspended', (data: { isSuspended: boolean }) => {
      updateTeamProfile({ isSuspended: data.isSuspended });
      if (data.isSuspended) {
        sound.playWarning();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const dismissAdminWarning = () => {
    setAdminWarningMessage(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        adminWarningMessage,
        dismissAdminWarning,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

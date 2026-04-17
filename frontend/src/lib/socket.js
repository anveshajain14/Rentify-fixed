'use client';

import { io } from 'socket.io-client';
import { apiBaseUrl } from './api';

let socketInstance = null;

export function getSocket() {
  if (socketInstance) return socketInstance;

  if (!apiBaseUrl) {
    console.warn('Socket disabled: NEXT_PUBLIC_API_URL is not set.');
    return {
      connected: false,
      connect: () => {},
      disconnect: () => {},
      on: () => {},
      off: () => {},
      emit: () => {},
    };
  }

  socketInstance = io(apiBaseUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
  return socketInstance;
}

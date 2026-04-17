'use client';

import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (socketInstance) return socketInstance;
  socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
  return socketInstance;
}

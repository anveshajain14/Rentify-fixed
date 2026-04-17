import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { isOriginAllowed } from '../middleware/corsConfig.js';

let ioInstance = null;
const userSockets = new Map(); // userId -> Set<socketId>
const socketUsers = new Map(); // socketId -> userId

function parseCookie(header) {
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

function addUserSocket(userId, socketId) {
  const current = userSockets.get(userId) || new Set();
  current.add(socketId);
  userSockets.set(userId, current);
  socketUsers.set(socketId, userId);
}

function removeUserSocket(socketId) {
  const userId = socketUsers.get(socketId);
  if (!userId) return;
  const current = userSockets.get(userId);
  if (current) {
    current.delete(socketId);
    if (current.size === 0) userSockets.delete(userId);
  }
  socketUsers.delete(socketId);
}

export function initSocket(server) {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowed = isOriginAllowed(origin);
        if (allowed) return callback(null, true);
        return callback(new Error(`Socket CORS blocked for origin: ${origin || 'none'}`));
      },
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    const cookies = parseCookie(socket.handshake.headers?.cookie || '');
    const token = cookies.token;
    if (!token) return next(new Error('Unauthorized'));
    const decoded = verifyToken(token);
    if (!decoded?.id) return next(new Error('Unauthorized'));
    socket.userId = String(decoded.id);
    return next();
  });

  ioInstance.on('connection', (socket) => {
    addUserSocket(socket.userId, socket.id);

    socket.on('joinConversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(String(conversationId));
    });

    socket.on('leaveConversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(String(conversationId));
    });

    socket.on('disconnect', () => {
      removeUserSocket(socket.id);
    });
  });

  return ioInstance;
}

export function getSocketIO() {
  return ioInstance;
}

export function emitToConversation(conversationId, event, payload) {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(String(conversationId)).emit(event, payload);
}

export function emitToUsers(userIds, event, payload) {
  if (!ioInstance || !Array.isArray(userIds)) return;
  userIds.forEach((userId) => {
    const socketIds = userSockets.get(String(userId));
    if (!socketIds) return;
    socketIds.forEach((socketId) => {
      ioInstance.to(socketId).emit(event, payload);
    });
  });
}

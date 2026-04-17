import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants/config';

let _socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (_socket?.connected) return _socket;

  _socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return _socket;
}

/** Возвращает текущий экземпляр сокета без создания нового */
export function getSocketInstance(): Socket | null {
  return _socket;
}

export function disconnectSocket() {
  _socket?.disconnect();
  _socket = null;
}

export function joinTaskRoom(taskId: string) {
  _socket?.emit('join_task_room', { task_id: taskId });
}

export function leaveTaskRoom(taskId: string) {
  _socket?.emit('leave_task_room', { task_id: taskId });
}

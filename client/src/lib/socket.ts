import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    // When opened from mobile or another device on the LAN, use the same hostname
    const host = window.location.hostname || 'localhost';
    return `${window.location.protocol}//${host}:4000`;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
}

export function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = getSocketUrl();
    console.log(`[CLIENT SOCKET] Connecting to dispatch engine at: ${socketUrl}`);

    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log(`[CLIENT SOCKET] Connected to dispatch engine: ${socketInstance?.id}`);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[CLIENT SOCKET] Disconnected: ${reason}`);
    });
  }
  return socketInstance;
}

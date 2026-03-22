import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { addMessage } from '../store/slices/messagesSlice';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace('/api', '')
  : 'http://10.0.2.2:4000';

let socketInstance: Socket | null = null;

export function useSocket(token: string | null, roomId?: string) {
  const dispatch = useDispatch();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token },
      });
    }
    socketRef.current = socketInstance;

    if (roomId) {
      socketInstance.emit('joinRoom', roomId);

      const handleNewMessage = (msg: any) => {
        dispatch(addMessage({ roomId, message: msg }));
      };

      socketInstance.on('newMessage', handleNewMessage);

      return () => {
        socketInstance?.off('newMessage', handleNewMessage);
      };
    }
  }, [token, roomId]);

  function sendMessage(roomId: string, content: string, senderName: string) {
    socketRef.current?.emit('sendMessage', { roomId, content, senderName });
  }

  return { sendMessage, socket: socketRef.current };
}

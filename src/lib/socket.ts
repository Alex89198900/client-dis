//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { SocketOptions } from 'engine.io-client';
import { ManagerOptions, Socket, io } from 'socket.io-client';
import { IncomingPersonalMessage } from '../store/app-store';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socket';

const socketOptions: Partial<ManagerOptions & SocketOptions> | undefined = {
  //rejectUnauthorized: false,
  //secure: true,
  // reconnection: false,
  // reconnectionAttempts: 1,
  // reconnectionDelay: 100,
  port: 3000,
};

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('https://server-dis.onrender.com', {
  withCredentials: true,
  extraHeaders: {
    'Access-Control-Allow-Origin': '*',
  },
});

export const createSocketEvent = <K extends keyof ClientToServerEvents>(
  name: K,
  data: Parameters<ClientToServerEvents[K]>[0]
) => ({
  name,
  data,
});

export const bindGlobalSocketEvents = () => {
  socket.connect();
  socket.on('connect', () => {
    console.log('connect');
  });

  socket.on('disconnect', () => {
    console.log('disconnect');
  });

  socket.on('connect_error', () => {
    // TODO: Handle this error
    console.log('connect error');
  });

  socket.on('id', (id) => {
    console.log('socket id', id);
  });
};

export const emitPersonalMessage = (message: FormData) => {
  const fromUser = message.get('fromUserId') ?? '';
  const tomUser = message.get('toUserId') ?? '';
  const event = createSocketEvent('personalMessage', {
    fromUserId: fromUser,
    toUserId: tomUser,
  });
  socket.emit(event.name, event.data);
};

export default socket;

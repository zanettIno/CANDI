import { Socket, io } from 'socket.io-client';
import { API_BASE_URL } from '@/constants/api';
import { getValidAccessToken } from '@/services/authService';

const SOCKET_URL = API_BASE_URL.replace('/api', '');

/**
 * Socket único do app.
 *
 * O token é lido a cada (re)conexão pelo callback `auth`, então o servidor sempre
 * identifica o usuário logado AGORA. Antes, o token era fixado na criação e, após
 * logout + login com outra conta, o socket continuava autenticado como o usuário
 * anterior (o "digitando" funcionava, mas o send_message era recusado).
 *
 * A instância nunca é descartada: no logout só desconectamos. Assim os listeners
 * registrados (GlobalSocketController, telas de chat) continuam válidos no próximo login.
 */
let socketInstance: Socket | null = null;

export const getOrCreateSocket = (): Socket => {
  if (socketInstance) return socketInstance;

  socketInstance = io(`${SOCKET_URL}/chat`, {
    autoConnect: false,
    auth: (cb) => {
      getValidAccessToken()
        .then(token => cb({ token }))
        .catch(() => cb({ token: null }));
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 10000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  socketInstance.on('connect', () => {
    console.log('[SocketService] Socket conectado, id:', socketInstance?.id);
  });
  socketInstance.on('disconnect', (reason) => {
    console.log('[SocketService] Socket desconectado:', reason);
  });
  socketInstance.on('connect_error', (err) => {
    console.error('[SocketService] Erro de conexão:', err);
  });

  return socketInstance;
};

/** Garante o socket conectado com o token do usuário atual. */
export const initializeSocket = async (): Promise<Socket> => {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Sem token de acesso');

  const socket = getOrCreateSocket();
  // `active` = conectado ou tentando reconectar; só chama connect() se estiver parado
  if (!socket.active) socket.connect();
  return socket;
};

export const getSocket = (): Socket | null => socketInstance;

/** Chamar no logout: derruba a conexão do usuário atual (mantém os listeners). */
export const disconnectSocket = () => {
  if (socketInstance?.active) {
    console.log('[SocketService] Desconectando socket');
    socketInstance.disconnect();
  }
};

export const isSocketConnected = (): boolean => socketInstance?.connected || false;

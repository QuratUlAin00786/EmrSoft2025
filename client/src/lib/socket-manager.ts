import React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';

type SocketUserInfo = {
  id?: number | string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
};

export function buildSocketUserIdentifier(user?: SocketUserInfo | null): string | null {
  if (!user?.id) {
    return null;
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const fallbackName = user.username || user.email || `user-${user.id}`;
  const name = (fullName || fallbackName).replace(/\s+/g, '-');
  const role = (user.role || 'user').replace(/\s+/g, '-');

  return `${user.id}_${name}_${role}`;
}

// Socket.IO Events (matching backend)
// Note: Backend uses events object, but actual event names are lowercase with underscores
export const SocketEvents = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ADD_USER: 'add_user', // Backend: events.ADD_USER
  ONLINE_USERS_UPDATE: 'online_users_update', // Backend: events.ONLINE_USERS_UPDATE
} as const;

export interface OnlineUsersUpdate {
  onlineUsers: string[];
}

export interface AddUserData {
  userId: string;
  deviceId?: string | null;
}

class SocketManager {
  private static instance: SocketManager | null = null;
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private onlineUsers: Set<string> = new Set();
  private listeners: Map<string, Set<Function>> = new Map();
  private currentUserId: string | null = null;
  private currentDeviceId: string | null = null;

  // Backend configuration
  private readonly SOCKET_URL = 'https://mk1.averox.com';
  private readonly API_KEY = '3a7520ec8dd5de7bf74e2f791b14167773cd747cf8f4f452f3f473251a1c803d';

  private constructor() {
    console.log('[SocketManager] Initializing Socket.IO client');
  }

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Connect to the Socket.IO server
   */
  connect(userIdentifier?: string, deviceId?: string | null): void {
    if (this.socket?.connected) {
      console.log('[SocketManager] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[SocketManager] Connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.currentUserId = userIdentifier || null;
    this.currentDeviceId = deviceId || null;

    console.log('[SocketManager] Connecting to', this.SOCKET_URL);

    // Create socket connection with authentication
    // Backend expects API key as 'x-api-key' in auth, headers, or query
    this.socket = io(this.SOCKET_URL, {
      auth: {
        'x-api-key': this.API_KEY,
        userIdentifier: this.currentUserId || undefined,
      },
      query: {
        'x-api-key': this.API_KEY,
      },
      extraHeaders: {
        'x-api-key': this.API_KEY,
        'x-user-identifier': this.currentUserId || '',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
      forceNew: false,
    });

    this.setupEventHandlers();

    // Handle connection
    this.socket.on(SocketEvents.CONNECT, () => {
      console.log('[SocketManager] ✅ Connected to Socket.IO server:', this.socket?.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Register user if userId is provided
      if (this.currentUserId) {
        this.addUser(this.currentUserId, this.currentDeviceId);
      }
    });

    // Handle disconnection
    this.socket.on(SocketEvents.DISCONNECT, (reason) => {
      console.log('[SocketManager] ❌ Disconnected from Socket.IO server:', reason);
      this.isConnecting = false;

      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('[SocketManager] Connection error:', error);
      this.isConnecting = false;
      this.handleReconnect();
    });
  }

  /**
   * Setup event handlers for Socket.IO events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Handle online users update
    this.socket.on(SocketEvents.ONLINE_USERS_UPDATE, (data: OnlineUsersUpdate) => {
      console.log('[SocketManager] 📡 Online users update:', data.onlineUsers);
      this.onlineUsers = new Set(data.onlineUsers);
      this.emit('online_users_update', data);
    });

    // Handle incoming call events - this will be forwarded to any listeners registered via .on()
    this.socket.on('incoming_call', (callData: any) => {
      console.log('[SocketManager] 📞 Incoming call received:', callData);
      // Emit to internal event system so hooks can listen
      this.emit('incoming_call', callData);
    });
  }

  /**
   * Add user to online users list
   */
  addUser(userId: string, deviceId?: string | null): void {
    if (!this.socket?.connected) {
      console.warn('[SocketManager] Cannot add user: not connected');
      return;
    }

    this.currentUserId = userId;
    this.currentDeviceId = deviceId || null;

    const addUserData: AddUserData = {
      userId,
      ...(deviceId && { deviceId }),
    };

    console.log('[SocketManager] 👤 Adding user:', addUserData);
    this.socket.emit(SocketEvents.ADD_USER, addUserData);
  }

  /**
   * Remove user from online users list
   */
  removeUser(): void {
    if (!this.socket?.connected || !this.currentUserId) {
      return;
    }

    console.log('[SocketManager] 👤 Removing user:', this.currentUserId);
    this.currentUserId = null;
    this.currentDeviceId = null;
  }

  /**
   * Disconnect from the Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[SocketManager] Disconnecting from Socket.IO server');
      this.removeUser();
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.onlineUsers.clear();
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SocketManager] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 5000);

    console.log(`[SocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.currentUserId) {
        this.connect(this.currentUserId, this.currentDeviceId);
      } else {
        this.connect();
      }
    }, delay);
  }

  /**
   * Subscribe to a Socket.IO event
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Also listen on socket if connected
    if (this.socket) {
      this.socket.on(event, callback as any);
    }

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from a Socket.IO event
   */
  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  /**
   * Emit an event to listeners (internal event system)
   */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SocketManager] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Emit an event to the server
   */
  emitToServer(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('[SocketManager] Cannot emit: not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get online users list
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

// Export singleton instance
export const socketManager = SocketManager.getInstance();

// Export hook for React components
export function useSocketManager() {
  const { user } = useAuth();

  // Auto-connect when user is available
  React.useEffect(() => {
    if (user?.id) {
      const userIdentifier = buildSocketUserIdentifier(user);
      if (!userIdentifier) {
        return;
      }
      const deviceId = `web-${navigator.userAgent.slice(0, 50)}-${Date.now()}`;
      
      socketManager.connect(userIdentifier, deviceId);

      return () => {
        socketManager.removeUser();
      };
    }
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.role]);

  return socketManager;
}


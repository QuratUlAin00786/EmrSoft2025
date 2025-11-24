import { useEffect, ReactNode } from 'react';
import { socketManager, SocketEvents, buildSocketUserIdentifier } from '@/lib/socket-manager';
import { useAuth } from '@/hooks/use-auth';

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Global Socket.IO Provider Component
 * Initializes Socket.IO connection on app startup and manages user registration
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user?.id) {
      console.log('[SocketProvider] User not authenticated, skipping Socket.IO connection');
      return;
    }

    const userIdentifier = buildSocketUserIdentifier(user);
    if (!userIdentifier) {
      console.warn('[SocketProvider] Unable to build socket user identifier');
      return;
    }
    // Generate a unique device ID for this browser session
    const deviceId = `web-${window.location.hostname}-${Date.now()}`;

    console.log('[SocketProvider] Initializing Socket.IO connection for user:', userIdentifier);

    // Connect to Socket.IO server
    socketManager.connect(userIdentifier, deviceId);

    // Set up global event listeners
    const unsubscribeOnlineUsers = socketManager.on(
      SocketEvents.ONLINE_USERS_UPDATE,
      (data: { onlineUsers: string[] }) => {
        console.log('[SocketProvider] Online users updated:', data.onlineUsers);
        // You can dispatch to a global state manager here if needed
        // For example: dispatch({ type: 'SET_ONLINE_USERS', payload: data.onlineUsers });
      }
    );

    // Cleanup on unmount or when user changes
    return () => {
      console.log('[SocketProvider] Cleaning up Socket.IO connection');
      unsubscribeOnlineUsers();
      socketManager.removeUser();
      // Note: We don't disconnect here to allow reconnection with new user
      // If you want to fully disconnect, call: socketManager.disconnect();
    };
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.role, isAuthenticated]);

  // Handle user logout
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[SocketProvider] User logged out, removing from Socket.IO');
      socketManager.removeUser();
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}


import { useState, useEffect, useCallback } from 'react';
import { socketManager } from '@/lib/socket-manager';
import type { IncomingCallData } from '@/components/telemedicine/incoming-call-modal';

export interface UseIncomingCallReturn {
  incomingCall: IncomingCallData | null;
  acceptCall: (callData: IncomingCallData) => void;
  declineCall: () => void;
  clearIncomingCall: () => void;
}

export function useIncomingCall(): UseIncomingCallReturn {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    // Listen for incoming call events
    const unsubscribe = socketManager.on('incoming_call', (callData: any) => {
      console.log('📞 Incoming call received in hook:', callData);
      
      // Transform the call data to match our interface
      const transformedCallData: IncomingCallData = {
        roomId: callData.roomId,
        fromUserId: callData.fromUserId,
        fromUsername: callData.fromUsername,
        isVideo: callData.isVideo || false,
        participants: callData.participants || [],
        isGroup: callData.isGroup || false,
        groupName: callData.groupName || null,
        token: callData.token,
        serverUrl: callData.serverUrl,
        e2eeKey: callData.e2eeKey,
        isDelayedCall: callData.isDelayedCall || false,
      };

      setIncomingCall(transformedCallData);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const acceptCall = useCallback((callData: IncomingCallData) => {
    console.log('✅ Accepting incoming call:', callData);
    setIncomingCall(null);
    // The actual joining will be handled by the component that uses this hook
  }, []);

  const declineCall = useCallback(() => {
    console.log('❌ Declining incoming call');
    const currentCall = incomingCall;
    setIncomingCall(null);
    // Optionally emit a decline event to the server
    if (currentCall) {
      socketManager.emitToServer('call_declined', {
        roomId: currentCall.roomId,
        fromUserId: currentCall.fromUserId,
      });
    }
  }, [incomingCall]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return {
    incomingCall,
    acceptCall,
    declineCall,
    clearIncomingCall,
  };
}


import { AccessToken } from 'livekit-server-sdk';

export interface LiveKitTokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  organizationId: number;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
}

export function generateLiveKitToken(options: LiveKitTokenOptions): string {
  const {
    roomName,
    participantName,
    participantIdentity,
    organizationId,
    canPublish = true,
    canSubscribe = true,
    canPublishData = true,
  } = options;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in environment variables');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
  });

  // Grant permissions
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData,
    canUpdateMetadata: true,
  });

  // Add custom metadata
  at.metadata = JSON.stringify({
    organizationId,
    participantName,
  });

  return at.toJwt();
}


const MK1_BASE_URL = "https://mk1.averox.com/api";
const MK1_API_KEY =
  "3a7520ec8dd5de7bf74e2f791b14167773cd747cf8f4f452f3f473251a1c803d";

export interface RemoteParticipant {
  identifier: string;
  displayName: string;
}

export interface CreateRemoteRoomParams {
  roomId: string;
  fromUsername: string;
  toUsers: RemoteParticipant[];
  isVideo: boolean;
  groupName?: string;
  checkOnly?: boolean;
}

export interface CreateRemoteRoomResponse {
  token: string;
  serverUrl: string;
  e2eeKey?: string;
  roomId: string;
  participants?: Array<{
    userId: string;
    username: string;
    isOnline: boolean;
  }>;
}

export async function createRemoteLiveKitRoom(
  params: CreateRemoteRoomParams,
): Promise<CreateRemoteRoomResponse> {
  if (!params.roomId) {
    throw new Error("roomId is required");
  }
  if (!params.fromUsername) {
    throw new Error("fromUsername is required");
  }
  if (!params.toUsers.length) {
    throw new Error("toUsers must include at least one participant");
  }

  const toUserIds = params.toUsers.map((user) => user.identifier);
  const toUsernames = Object.fromEntries(
    params.toUsers.map((user) => [user.identifier, user.displayName]),
  );

  const payload: Record<string, unknown> = {
    roomId: params.roomId,
    toUserIds,
    toUsernames,
    isVideo: params.isVideo,
    fromUsername: params.fromUsername,
  };

  if (params.groupName) {
    payload.groupName = params.groupName;
  }

  if (typeof params.checkOnly === "boolean") {
    payload.checkOnly = params.checkOnly;
  }

  const response = await fetch(`${MK1_BASE_URL}/create-room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": MK1_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log('LiveKit room response:', text);
  if (!response.ok) {
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Failed to parse LiveKit room response");
  }
}



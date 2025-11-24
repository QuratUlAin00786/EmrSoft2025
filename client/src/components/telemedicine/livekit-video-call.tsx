import { useEffect, useRef } from 'react';
import { useLiveKitRoom } from '@/hooks/use-livekit-room';
import { LiveKitControls } from './livekit-controls';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Video, VideoOff, User } from 'lucide-react';
import { RemoteParticipant, Track, RoomEvent } from 'livekit-client';

interface LiveKitVideoCallProps {
  roomName: string;
  participantName: string;
  token?: string;
  serverUrl?: string;
  onDisconnect?: () => void;
  showControls?: boolean;
}

export function LiveKitVideoCall({
  roomName,
  participantName,
  token,
  serverUrl,
  onDisconnect,
  showControls = true,
}: LiveKitVideoCallProps) {
  const {
    room,
    isConnected,
    isConnecting,
    error,
    localParticipant,
    remoteParticipants,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
  } = useLiveKitRoom();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Connect on mount
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect({
        roomName,
        participantName,
        audioEnabled: true,
        videoEnabled: true,
        token,
        url: serverUrl,
      });
    }
  }, [
    roomName,
    participantName,
    token,
    serverUrl,
    isConnected,
    isConnecting,
    connect,
  ]);

  // Attach local video track
  useEffect(() => {
    if (!room || !localParticipant || !localVideoRef.current) return;

    // Function to attach local video track
    const attachLocalVideo = () => {
      if (!localVideoRef.current) return;
      
      // Get the first video track publication
      const videoPublication = Array.from(localParticipant.videoTrackPublications.values())[0];
      if (videoPublication?.track && localVideoRef.current) {
        videoPublication.track.attach(localVideoRef.current);
        console.log('📹 Attached local video track');
      }
    };

    // Attach immediately if track exists
    attachLocalVideo();

    // Listen for local track published events
    const handleLocalTrackPublished = (publication: any, participant: any) => {
      if (publication.kind === 'video' && participant.isLocal) {
        console.log('📹 Local video track published');
        attachLocalVideo();
      }
    };

    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      if (localVideoRef.current) {
        const videoPublication = Array.from(localParticipant.videoTrackPublications.values())[0];
        if (videoPublication?.track) {
          videoPublication.track.detach();
        }
      }
    };
  }, [room, localParticipant]);

  // Attach remote video and audio tracks
  useEffect(() => {
    if (!room || !isConnected) return;

    // Function to attach video track for a participant
    const attachVideoTrack = (participant: RemoteParticipant) => {
      const videoPublication = Array.from(participant.videoTrackPublications.values())[0];
      const videoTrack = videoPublication?.track;
      
      if (videoTrack) {
        let videoElement = remoteVideoRefs.current.get(participant.identity);
        if (!videoElement) {
          videoElement = document.createElement('video');
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = false;
          videoElement.className = 'w-full h-full object-cover rounded-lg';
          remoteVideoRefs.current.set(participant.identity, videoElement);
          console.log('📹 Created video element for participant:', participant.identity);
        }
        
        if (videoElement) {
          videoTrack.attach(videoElement);
          console.log('📹 Attached video track for participant:', participant.identity);
        }
      }
    };

    // Function to attach audio track for a participant
    const attachAudioTrack = (participant: RemoteParticipant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          let audioElement = remoteAudioRefs.current.get(participant.identity);
          
          if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            audioElement.setAttribute('data-participant', participant.identity);
            remoteAudioRefs.current.set(participant.identity, audioElement);
            audioElement.style.display = 'none';
            document.body.appendChild(audioElement);
          }

          publication.track.attach(audioElement);
          console.log('🔊 Attached audio track for participant:', participant.identity);
        }
      });
    };

    // Attach tracks for existing remote participants
    remoteParticipants.forEach((participant) => {
      attachVideoTrack(participant);
      attachAudioTrack(participant);
    });

    // Listen for new tracks
    const handleTrackSubscribed = (track: Track, publication: any, participant: RemoteParticipant) => {
      console.log('📹 Track subscribed:', track.kind, participant.identity);
      
      if (track.kind === Track.Kind.Video) {
        attachVideoTrack(participant);
        // Force a small delay to ensure DOM is ready, then trigger re-render
        setTimeout(() => {
          // This will cause the ref callbacks to run again
          const event = new Event('resize');
          window.dispatchEvent(event);
        }, 100);
      } else if (track.kind === Track.Kind.Audio) {
        attachAudioTrack(participant);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    return () => {
      if (room) {
        room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      }
      remoteVideoRefs.current.forEach((element) => {
        element.remove();
      });
      remoteVideoRefs.current.clear();
      remoteAudioRefs.current.forEach((element) => {
        element.remove();
      });
      remoteAudioRefs.current.clear();
    };
  }, [room, isConnected, remoteParticipants]);

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-500 mb-4">❌ {error}</div>
          <button
            onClick={() => connect({ roomName, participantName })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry Connection
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="p-6">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Connecting to call...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Remote Participants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 h-full">
        {remoteParticipants.length > 0 ? (
          remoteParticipants.map((participant) => {
            const hasVideo = participant.videoTrackPublications.size > 0;
            return (
              <div
                key={participant.identity}
                className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video"
                ref={(el) => {
                  if (el) {
                    const videoEl = remoteVideoRefs.current.get(participant.identity);
                    if (videoEl) {
                      // Clear existing children
                      while (el.firstChild) {
                        el.removeChild(el.firstChild);
                      }
                      // Append video element
                      el.appendChild(videoEl);
                    }
                  }
                }}
              >
                {!hasVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback>
                        <User className="w-12 h-12" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {participant.name || participant.identity}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full flex items-center justify-center h-full">
            <div className="text-center text-white">
              <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Waiting for other participants...</p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video Preview */}
      {isConnected && localParticipant && (
        <div className="absolute bottom-20 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10">
          {isVideoEnabled && localParticipant.videoTrackPublications.size > 0 ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <Avatar className="w-16 h-16">
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/50 text-white px-2 py-0.5 rounded text-xs">
            You
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && isConnected && (
        <LiveKitControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}


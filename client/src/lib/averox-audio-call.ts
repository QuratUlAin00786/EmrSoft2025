/**
 * Averox Audio Call Manager
 * Handles WebRTC audio calling with WebSocket signaling via Averox servers
 */

const AVEROX_SOCKET_URL = 'wss://mk1.averox.com/';
const AVEROX_ROOM_API = 'https://mk1.averox.com/api/create-room';
const AVEROX_API_KEY_ENDPOINT = '/api/averox/api-key';

export interface AudioCallConfig {
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
}

interface AveroxApiKeyResponse {
  apiKey: string;
}

export interface AudioCallCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnded?: () => void;
}

export class AveroxAudioCallManager {
  private socket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private roomId: string | null = null;
  private config: AudioCallConfig | null = null;
  private callbacks: AudioCallCallbacks = {};
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isIntentionalDisconnect: boolean = false;
  private apiKey: string | null = null;

  // WebRTC configuration with STUN servers for NAT traversal
  private readonly rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  constructor(callbacks: AudioCallCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Fetch Averox API key from backend
   */
  private async fetchApiKey(): Promise<string> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(AVEROX_API_KEY_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Averox API key');
      }

      const data: AveroxApiKeyResponse = await response.json();
      return data.apiKey;
    } catch (error) {
      console.error('❌ Failed to fetch Averox API key:', error);
      throw error;
    }
  }

  /**
   * Initialize and connect to Averox WebSocket signaling server
   */
  async connect(config: AudioCallConfig): Promise<void> {
    this.config = config;
    
    // Fetch API key if not already cached
    if (!this.apiKey) {
      this.apiKey = await this.fetchApiKey();
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Try connecting without token in URL - will send auth after connection
        console.log('🔌 Connecting to Averox signaling server:', AVEROX_SOCKET_URL);
        
        this.socket = new WebSocket(AVEROX_SOCKET_URL);

        this.socket.onopen = () => {
          console.log('✅ WebSocket connected to Averox - sending authentication...');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Send authentication message first
          this.sendSignal({
            type: 'auth',
            apiKey: this.apiKey
          });
          
          // Then register user with signaling server
          this.sendSignal({
            type: 'login',
            userId: config.userId,
            userName: config.userName
          });

          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleSignalingMessage(event);
        };

        this.socket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.callbacks.onError?.('WebSocket connection error');
          reject(new Error('WebSocket connection failed'));
        };

        this.socket.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnected = false;
          this.handleDisconnect();
        };

      } catch (error) {
        console.error('💥 Failed to connect to Averox:', error);
        reject(error);
      }
    });
  }

  /**
   * Create or join a room via Averox API
   */
  async createRoom(): Promise<{ roomId: string }> {
    try {
      console.log('🏠 Creating Averox room...');
      
      // Ensure API key is available
      if (!this.apiKey) {
        this.apiKey = await this.fetchApiKey();
      }
      
      const response = await fetch(AVEROX_ROOM_API, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          roomName: `audio-call-${this.config?.userId}-${this.config?.targetUserId}-${Date.now()}`,
          participants: [this.config?.userId, this.config?.targetUserId],
          roomType: 'audio'
        })
      });

      if (!response.ok) {
        throw new Error(`Room creation failed: ${response.status}`);
      }

      const data = await response.json();
      this.roomId = data.roomId || `room-${Date.now()}`;
      
      console.log('✅ Room created:', this.roomId);
      return { roomId: this.roomId as string };

    } catch (error) {
      console.error('💥 Failed to create room:', error);
      // Fallback: create local room ID
      this.roomId = `local-room-${Date.now()}`;
      return { roomId: this.roomId };
    }
  }

  /**
   * Start audio call - initiator side
   */
  async startCall(): Promise<void> {
    try {
      console.log('📞 Starting audio call...');

      // Get audio stream from microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      console.log('🎤 Microphone access granted');

      // Create peer connection
      await this.setupPeerConnection();

      // Add local audio track to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('➕ Adding track to peer connection:', track.kind);
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Create and send offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });

      await this.peerConnection!.setLocalDescription(offer);

      console.log('📤 Sending call offer...');
      this.sendSignal({
        type: 'offer',
        offer: offer,
        roomId: this.roomId,
        to: this.config?.targetUserId,
        from: this.config?.userId
      });

    } catch (error) {
      console.error('💥 Failed to start call:', error);
      this.callbacks.onError?.('Failed to access microphone or start call');
      throw error;
    }
  }

  /**
   * Answer incoming call
   */
  async answerCall(offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      console.log('📞 Answering incoming call...');

      // Get audio stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Setup peer connection
      await this.setupPeerConnection();

      // Add local audio track
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Set remote description (offer)
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer back
      console.log('📤 Sending answer...');
      this.sendSignal({
        type: 'answer',
        answer: answer,
        roomId: this.roomId,
        to: this.config?.targetUserId,
        from: this.config?.userId
      });

    } catch (error) {
      console.error('💥 Failed to answer call:', error);
      this.callbacks.onError?.('Failed to answer call');
      throw error;
    }
  }

  /**
   * Setup RTCPeerConnection with event handlers
   */
  private async setupPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        this.sendSignal({
          type: 'candidate',
          candidate: event.candidate,
          roomId: this.roomId,
          to: this.config?.targetUserId,
          from: this.config?.userId
        });
      }
    };

    // Handle remote audio stream
    this.peerConnection.ontrack = (event) => {
      console.log('🔊 Received remote audio stream');
      
      if (event.streams && event.streams[0]) {
        // Create audio element to play remote audio
        this.remoteAudioElement = new Audio();
        this.remoteAudioElement.srcObject = event.streams[0];
        this.remoteAudioElement.autoplay = true;
        this.remoteAudioElement.play().catch(err => {
          console.error('Failed to play remote audio:', err);
        });

        this.callbacks.onRemoteStream?.(event.streams[0]);
      }
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', this.peerConnection?.connectionState);
      
      if (this.peerConnection?.connectionState === 'connected') {
        console.log('✅ Peer connection established');
        // Only trigger onConnected when actual peer connection is established
        this.callbacks.onConnected?.();
      } else if (this.peerConnection?.connectionState === 'failed') {
        console.log('❌ Peer connection failed, attempting ICE restart...');
        this.peerConnection?.restartIce();
      } else if (this.peerConnection?.connectionState === 'disconnected') {
        console.log('⚠️ Peer connection disconnected');
        this.callbacks.onDisconnected?.();
      }
    };

    // Monitor ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection?.iceConnectionState);
    };
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleSignalingMessage(event: MessageEvent): Promise<void> {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Received signaling message:', data.type);

      switch (data.type) {
        case 'login':
          if (data.success) {
            console.log('✅ Login successful');
          } else {
            console.error('❌ Login failed:', data.message);
            this.callbacks.onError?.('Login to signaling server failed');
          }
          break;

        case 'offer':
          console.log('📞 Received call offer');
          await this.answerCall(data.offer);
          break;

        case 'answer':
          console.log('📞 Received call answer');
          await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data.answer));
          break;

        case 'candidate':
          console.log('🧊 Received ICE candidate');
          if (data.candidate) {
            await this.peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;

        case 'leave':
          console.log('👋 Remote user left call');
          this.endCall();
          break;

        default:
          console.log('❓ Unknown message type:', data.type);
      }

    } catch (error) {
      console.error('💥 Error handling signaling message:', error);
    }
  }

  /**
   * Send signaling message via WebSocket
   */
  private sendSignal(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('❌ Cannot send signal - WebSocket not connected');
    }
  }

  /**
   * Toggle microphone mute/unmute
   */
  toggleMute(): boolean {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log(audioTrack.enabled ? '🔊 Microphone unmuted' : '🔇 Microphone muted');
      return !audioTrack.enabled; // Return true if muted
    }
    return false;
  }

  /**
   * Get current mute state
   */
  isMuted(): boolean {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : false;
  }

  /**
   * End the call and cleanup resources
   */
  endCall(): void {
    console.log('📵 Ending call...');

    // Set flag to prevent reconnection attempts
    this.isIntentionalDisconnect = true;

    // Notify remote peer
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSignal({
        type: 'leave',
        roomId: this.roomId,
        to: this.config?.targetUserId,
        from: this.config?.userId
      });
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    // Stop remote audio
    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Close WebSocket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnected = false;
    this.roomId = null;
    
    console.log('✅ Call ended and resources cleaned up');
    this.callbacks.onCallEnded?.();
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    // Don't reconnect if this was an intentional disconnect
    if (this.isIntentionalDisconnect) {
      console.log('📵 Call ended intentionally - skipping reconnection');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        if (this.config) {
          this.connect(this.config).catch(err => {
            console.error('Reconnection failed:', err);
          });
        }
      }, 2000 * this.reconnectAttempts);
    } else {
      console.log('❌ Max reconnection attempts reached');
      this.callbacks.onDisconnected?.();
    }
  }

  /**
   * Get connection status
   */
  getConnectionState(): string {
    return this.peerConnection?.connectionState || 'disconnected';
  }

  /**
   * Check if call is active
   */
  isCallActive(): boolean {
    return this.isConnected && this.peerConnection !== null;
  }
}

export default AveroxAudioCallManager;

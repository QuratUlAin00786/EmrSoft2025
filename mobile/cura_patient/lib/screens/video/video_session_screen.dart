import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class VideoSessionScreen extends StatefulWidget {
  final int? appointmentId;
  final String? doctorName;

  const VideoSessionScreen({
    super.key,
    this.appointmentId,
    this.doctorName,
  });

  @override
  State<VideoSessionScreen> createState() => _VideoSessionScreenState();
}

class _VideoSessionScreenState extends State<VideoSessionScreen> {
  bool _isVideoEnabled = true;
  bool _isAudioEnabled = true;
  bool _isCallActive = false;
  bool _isConnecting = false;
  String _callDuration = '00:00';
  String _connectionStatus = 'Ready to connect';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black.withOpacity(0.5),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.doctorName ?? 'Video Session',
              style: const TextStyle(fontSize: 16),
            ),
            Text(
              _connectionStatus,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          if (_isCallActive)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  _callDuration,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          // Main video view
          Container(
            width: double.infinity,
            height: double.infinity,
            color: Colors.black,
            child: _isCallActive
                ? _buildActiveCallView()
                : _buildWaitingView(),
          ),

          // Self video preview (when call is active)
          if (_isCallActive && _isVideoEnabled)
            Positioned(
              top: 80,
              right: 16,
              child: _buildSelfVideoPreview(),
            ),

          // Control buttons
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: _buildControlButtons(),
          ),

          // Call status overlay
          if (_isConnecting)
            Container(
              color: Colors.black.withOpacity(0.7),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Connecting...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActiveCallView() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.grey[900]!,
            Colors.black,
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Doctor video placeholder
          Container(
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: AppColors.primary, width: 3),
            ),
            child: const Icon(
              Icons.person,
              size: 80,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            widget.doctorName ?? 'Doctor',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Video consultation in progress',
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitingView() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.primary.withOpacity(0.8),
            Colors.black,
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.video_call,
            size: 120,
            color: Colors.white.withOpacity(0.8),
          ),
          const SizedBox(height: 32),
          const Text(
            'Ready to start video consultation',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            widget.doctorName != null
                ? 'Tap the call button to connect with ${widget.doctorName}'
                : 'Tap the call button to start the consultation',
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 16,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 48),
          // Pre-call setup
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 32),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text(
                  'Pre-call Setup',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildPreCallOption(
                      'Camera',
                      _isVideoEnabled ? Icons.videocam : Icons.videocam_off,
                      _isVideoEnabled,
                      () => setState(() => _isVideoEnabled = !_isVideoEnabled),
                    ),
                    _buildPreCallOption(
                      'Microphone',
                      _isAudioEnabled ? Icons.mic : Icons.mic_off,
                      _isAudioEnabled,
                      () => setState(() => _isAudioEnabled = !_isAudioEnabled),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreCallOption(String label, IconData icon, bool isEnabled, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: isEnabled
                  ? AppColors.success.withOpacity(0.2)
                  : AppColors.error.withOpacity(0.2),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: isEnabled ? AppColors.success : AppColors.error,
                width: 2,
              ),
            ),
            child: Icon(
              icon,
              color: isEnabled ? AppColors.success : AppColors.error,
              size: 28,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelfVideoPreview() {
    return Container(
      width: 120,
      height: 160,
      decoration: BoxDecoration(
        color: Colors.grey[800],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Stack(
          children: [
            Container(
              width: double.infinity,
              height: double.infinity,
              color: Colors.grey[800],
              child: const Icon(
                Icons.person,
                color: Colors.white,
                size: 40,
              ),
            ),
            if (!_isVideoEnabled)
              Container(
                width: double.infinity,
                height: double.infinity,
                color: Colors.black.withOpacity(0.8),
                child: const Center(
                  child: Icon(
                    Icons.videocam_off,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButtons() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Video toggle
          _buildControlButton(
            _isVideoEnabled ? Icons.videocam : Icons.videocam_off,
            _isVideoEnabled ? Colors.white : AppColors.error,
            () => setState(() => _isVideoEnabled = !_isVideoEnabled),
          ),

          // Audio toggle
          _buildControlButton(
            _isAudioEnabled ? Icons.mic : Icons.mic_off,
            _isAudioEnabled ? Colors.white : AppColors.error,
            () => setState(() => _isAudioEnabled = !_isAudioEnabled),
          ),

          // Call/End call button
          _buildCallButton(),

          // Chat
          _buildControlButton(
            Icons.chat,
            Colors.white,
            _showChatDialog,
          ),

          // More options
          _buildControlButton(
            Icons.more_vert,
            Colors.white,
            _showMoreOptions,
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton(IconData icon, Color color, VoidCallback onPressed) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(28),
      ),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(icon, color: color, size: 28),
      ),
    );
  }

  Widget _buildCallButton() {
    return Container(
      width: 70,
      height: 70,
      decoration: BoxDecoration(
        color: _isCallActive ? AppColors.error : AppColors.success,
        borderRadius: BorderRadius.circular(35),
        boxShadow: [
          BoxShadow(
            color: (_isCallActive ? AppColors.error : AppColors.success).withOpacity(0.3),
            blurRadius: 10,
            spreadRadius: 2,
          ),
        ],
      ),
      child: IconButton(
        onPressed: _toggleCall,
        icon: Icon(
          _isCallActive ? Icons.call_end : Icons.call,
          color: Colors.white,
          size: 32,
        ),
      ),
    );
  }

  void _toggleCall() async {
    if (_isCallActive) {
      // End call
      setState(() {
        _isCallActive = false;
        _connectionStatus = 'Call ended';
        _callDuration = '00:00';
      });
      
      // Show call summary
      _showCallSummaryDialog();
    } else {
      // Start call
      setState(() {
        _isConnecting = true;
        _connectionStatus = 'Connecting...';
      });

      // Simulate connection delay
      await Future.delayed(const Duration(seconds: 2));

      setState(() {
        _isConnecting = false;
        _isCallActive = true;
        _connectionStatus = 'Connected';
      });

      // Start call timer
      _startCallTimer();
    }
  }

  void _startCallTimer() {
    // Simulate call timer
    int seconds = 0;
    Future.doWhile(() async {
      if (!_isCallActive) return false;
      
      await Future.delayed(const Duration(seconds: 1));
      if (mounted && _isCallActive) {
        seconds++;
        final minutes = seconds ~/ 60;
        final remainingSeconds = seconds % 60;
        setState(() {
          _callDuration = '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
        });
      }
      return _isCallActive;
    });
  }

  void _showChatDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Chat'),
        content: SizedBox(
          width: double.maxFinite,
          height: 300,
          child: Column(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text(
                      'Chat messages will appear here',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Message sent')),
                      );
                    },
                    icon: Icon(Icons.send, color: AppColors.primary),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showMoreOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'More Options',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            ListTile(
              leading: const Icon(Icons.speaker_phone),
              title: const Text('Switch to Speaker'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Switched to speaker')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.record_voice_over),
              title: const Text('Record Session'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Recording started')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.picture_in_picture),
              title: const Text('Picture in Picture'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('PiP mode activated')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCallSummaryDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Call Summary'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Doctor: ${widget.doctorName ?? 'Unknown Doctor'}'),
            Text('Duration: $_callDuration'),
            const SizedBox(height: 16),
            const Text(
              'How was your consultation?',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Go back to previous screen
            },
            child: const Text('Done'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showFeedbackDialog();
            },
            child: const Text('Rate Consultation'),
          ),
        ],
      ),
    );
  }

  void _showFeedbackDialog() {
    int rating = 5;
    final feedbackController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rate Your Consultation'),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('How would you rate your consultation?'),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        rating = index + 1;
                      });
                    },
                    child: Icon(
                      Icons.star,
                      color: index < rating ? Colors.amber : Colors.grey[300],
                      size: 32,
                    ),
                  );
                }),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: feedbackController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Optional feedback...',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Go back to previous screen
            },
            child: const Text('Skip'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Go back to previous screen
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Thank you for your ${rating}-star rating!'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}
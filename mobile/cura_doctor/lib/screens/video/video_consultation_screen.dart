import 'package:flutter/material.dart';
import 'dart:async';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';

class VideoConsultationScreen extends StatefulWidget {
  final Map<String, dynamic>? patient;
  final Map<String, dynamic>? appointment;

  const VideoConsultationScreen({
    super.key,
    this.patient,
    this.appointment,
  });

  @override
  State<VideoConsultationScreen> createState() => _VideoConsultationScreenState();
}

class _VideoConsultationScreenState extends State<VideoConsultationScreen> {
  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _isSpeakerOn = true;
  bool _isConnected = false;
  bool _isRecording = false;
  bool _showPatientInfo = false;
  String _connectionStatus = 'Connecting...';
  Timer? _connectionTimer;
  Timer? _durationTimer;
  Duration _sessionDuration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _simulateConnection();
  }

  void _simulateConnection() {
    _connectionTimer = Timer(const Duration(seconds: 3), () {
      setState(() {
        _isConnected = true;
        _connectionStatus = 'Connected';
      });
      _startDurationTimer();
    });
  }

  void _startDurationTimer() {
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _sessionDuration = Duration(seconds: _sessionDuration.inSeconds + 1);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Main video view
            Container(
              width: double.infinity,
              height: double.infinity,
              child: _isConnected
                  ? _buildVideoView()
                  : _buildConnectingView(),
            ),

            // Top status bar
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: _buildTopBar(),
            ),

            // Patient info overlay
            if (_showPatientInfo && _isConnected)
              Positioned(
                top: 80,
                left: 16,
                child: _buildPatientInfoOverlay(),
              ),

            // Control buttons at bottom
            Positioned(
              bottom: 50,
              left: 16,
              right: 16,
              child: _buildControlButtons(),
            ),

            // Recording indicator
            if (_isRecording)
              Positioned(
                top: 80,
                right: 16,
                child: _buildRecordingIndicator(),
              ),

            // Self video preview (picture-in-picture)
            if (_isConnected && !_isVideoOff)
              Positioned(
                top: 100,
                right: 16,
                child: _buildSelfVideoPreview(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectingView() {
    final patientName = widget.patient != null 
        ? widget.patient!['name'] ?? 'Patient'
        : widget.appointment != null
            ? widget.appointment!['patientName'] ?? 'Patient'
            : 'Patient';

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.primary.withOpacity(0.8),
            AppColors.primary.withOpacity(0.4),
            Colors.black.withOpacity(0.8),
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(50),
            ),
            child: Icon(
              Icons.person,
              size: 50,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            patientName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _connectionStatus,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildVideoView() {
    final patientName = widget.patient != null 
        ? widget.patient!['name'] ?? 'Patient'
        : widget.appointment != null
            ? widget.appointment!['patientName'] ?? 'Patient'
            : 'Patient';

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary.withOpacity(0.3),
            Colors.blue.withOpacity(0.2),
            Colors.purple.withOpacity(0.2),
          ],
        ),
      ),
      child: Stack(
        children: [
          // Simulated video feed with animated gradient
          AnimatedContainer(
            duration: const Duration(seconds: 2),
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primary.withOpacity(0.6),
                  Colors.blue.withOpacity(0.4),
                  Colors.green.withOpacity(0.3),
                ],
              ),
            ),
          ),
          
          // Patient representation
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(60),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.5),
                      width: 3,
                    ),
                  ),
                  child: Icon(
                    Icons.person,
                    size: 60,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  patientName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    shadows: [
                      Shadow(
                        offset: Offset(1, 1),
                        blurRadius: 3,
                        color: Colors.black54,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        borderRadius: BorderRadius.circular(25),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: _isConnected ? Colors.green : Colors.red,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            _connectionStatus,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const Spacer(),
          if (_isConnected) ...[
            Icon(Icons.access_time, size: 16, color: Colors.white70),
            const SizedBox(width: 4),
            Text(
              _formatDuration(_sessionDuration),
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
            ),
            const SizedBox(width: 16),
            GestureDetector(
              onTap: () {
                setState(() {
                  _showPatientInfo = !_showPatientInfo;
                });
              },
              child: Icon(
                Icons.info_outline,
                size: 20,
                color: Colors.white70,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPatientInfoOverlay() {
    final patient = widget.patient;
    final appointment = widget.appointment;
    
    return Container(
      width: 280,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.8),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Icons.person, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Patient Information',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => setState(() => _showPatientInfo = false),
                child: Icon(Icons.close, color: Colors.white70, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (patient != null) ...[
            _buildInfoRow('Name:', patient['name'] ?? 'N/A'),
            _buildInfoRow('Age:', _calculateAge(patient['dateOfBirth'])),
            _buildInfoRow('Gender:', patient['gender'] ?? 'N/A'),
            _buildInfoRow('Phone:', patient['phone'] ?? 'N/A'),
            if (patient['riskLevel'] != null)
              _buildInfoRow('Risk Level:', patient['riskLevel']),
          ],
          if (appointment != null) ...[
            _buildInfoRow('Appointment:', appointment['title'] ?? 'Consultation'),
            _buildInfoRow('Type:', appointment['type'] ?? 'General'),
            if (appointment['description'] != null)
              _buildInfoRow('Notes:', appointment['description']),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecordingIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 6),
          const Text(
            'REC',
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButtons() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(25),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildControlButton(
            icon: _isMuted ? Icons.mic_off : Icons.mic,
            isActive: !_isMuted,
            onPressed: () {
              setState(() {
                _isMuted = !_isMuted;
              });
            },
          ),
          _buildControlButton(
            icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
            isActive: !_isVideoOff,
            onPressed: () {
              setState(() {
                _isVideoOff = !_isVideoOff;
              });
            },
          ),
          _buildControlButton(
            icon: _isSpeakerOn ? Icons.volume_up : Icons.volume_down,
            isActive: _isSpeakerOn,
            onPressed: () {
              setState(() {
                _isSpeakerOn = !_isSpeakerOn;
              });
            },
          ),
          _buildControlButton(
            icon: _isRecording ? Icons.stop : Icons.fiber_manual_record,
            isActive: _isRecording,
            backgroundColor: _isRecording ? Colors.orange : null,
            onPressed: () {
              setState(() {
                _isRecording = !_isRecording;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isRecording ? 'Recording started' : 'Recording stopped'),
                  backgroundColor: _isRecording ? Colors.red : AppColors.success,
                ),
              );
            },
          ),
          _buildControlButton(
            icon: Icons.call_end,
            isActive: false,
            backgroundColor: Colors.red,
            onPressed: () => _endConsultation(),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required bool isActive,
    Color? backgroundColor,
    required VoidCallback onPressed,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: backgroundColor ?? (isActive ? Colors.white.withOpacity(0.2) : Colors.white.withOpacity(0.1)),
          borderRadius: BorderRadius.circular(25),
          border: Border.all(
            color: isActive ? Colors.white.withOpacity(0.3) : Colors.white.withOpacity(0.1),
            width: 2,
          ),
        ),
        child: Icon(
          icon,
          color: backgroundColor != null ? Colors.white : (isActive ? Colors.white : Colors.white60),
          size: 22,
        ),
      ),
    );
  }

  Widget _buildSelfVideoPreview() {
    return Container(
      width: 120,
      height: 160,
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.8),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: Stack(
        children: [
          Container(
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.primary.withOpacity(0.4),
                  Colors.blue.withOpacity(0.3),
                ],
              ),
            ),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    Icons.person,
                    size: 20,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Dr. You',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _endConsultation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End Consultation'),
        content: const Text('Are you sure you want to end this video consultation?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Consultation ended (Duration: ${_formatDuration(_sessionDuration)})'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: Text(
              'End Consultation',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  String _calculateAge(String? dateOfBirth) {
    if (dateOfBirth == null) return 'N/A';
    try {
      final birthDate = DateTime.parse(dateOfBirth);
      final now = DateTime.now();
      final age = now.year - birthDate.year;
      if (now.month < birthDate.month || 
          (now.month == birthDate.month && now.day < birthDate.day)) {
        return '${age - 1} years';
      }
      return '$age years';
    } catch (e) {
      return 'N/A';
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return "${twoDigits(duration.inHours)}:$twoDigitMinutes:$twoDigitSeconds";
  }

  @override
  void dispose() {
    _connectionTimer?.cancel();
    _durationTimer?.cancel();
    super.dispose();
  }
}
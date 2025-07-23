import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/app_colors.dart';
import 'dart:async';

class ChatScreen extends StatefulWidget {
  final Map<String, dynamic>? conversation;
  final String? doctorName;

  const ChatScreen({
    super.key,
    this.conversation,
    this.doctorName,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  bool _isTyping = false;
  Timer? _typingTimer;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  void _loadMessages() {
    // Sample messages for demonstration
    _messages = [
      {
        'id': '1',
        'text': 'Hello! How are you feeling today?',
        'isMe': false,
        'timestamp': DateTime.now().subtract(const Duration(hours: 2)),
        'isRead': true,
      },
      {
        'id': '2',
        'text': 'Hi Dr. ${widget.doctorName ?? 'Smith'}! I\'ve been having some mild headaches lately.',
        'isMe': true,
        'timestamp': DateTime.now().subtract(const Duration(hours: 1, minutes: 45)),
        'isRead': true,
      },
      {
        'id': '3',
        'text': 'I understand. Can you tell me more about when these headaches occur? Is it at a specific time of day?',
        'isMe': false,
        'timestamp': DateTime.now().subtract(const Duration(hours: 1, minutes: 30)),
        'isRead': true,
      },
      {
        'id': '4',
        'text': 'They usually happen in the afternoon, around 3-4 PM. It feels like tension in my forehead.',
        'isMe': true,
        'timestamp': DateTime.now().subtract(const Duration(hours: 1, minutes: 15)),
        'isRead': true,
      },
      {
        'id': '5',
        'text': 'That sounds like it could be related to screen time or stress. Are you working on a computer during those hours?',
        'isMe': false,
        'timestamp': DateTime.now().subtract(const Duration(minutes: 45)),
        'isRead': true,
      },
      {
        'id': '6',
        'text': 'Yes, I work from home and spend most of my day on the computer. Could that be causing it?',
        'isMe': true,
        'timestamp': DateTime.now().subtract(const Duration(minutes: 30)),
        'isRead': false,
      },
    ];

    setState(() {
      _isLoading = false;
    });

    // Auto scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 1,
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.person,
                color: AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Dr. ${widget.doctorName ?? 'Healthcare Provider'}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (_isTyping)
                    Text(
                      'typing...',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        fontStyle: FontStyle.italic,
                      ),
                    )
                  else
                    Text(
                      'Online',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.success,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.videocam),
            onPressed: _startVideoCall,
          ),
          IconButton(
            icon: const Icon(Icons.phone),
            onPressed: _startVoiceCall,
          ),
          PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'clear',
                child: Row(
                  children: [
                    Icon(Icons.clear_all, size: 16),
                    SizedBox(width: 8),
                    Text('Clear Chat'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'export',
                child: Row(
                  children: [
                    Icon(Icons.download, size: 16),
                    SizedBox(width: 8),
                    Text('Export Chat'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return _buildMessageBubble(message, index);
                    },
                  ),
          ),

          // Message input
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    onPressed: _showAttachmentOptions,
                    icon: Icon(
                      Icons.attach_file,
                      color: AppColors.primary,
                    ),
                  ),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(25),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: TextField(
                        controller: _messageController,
                        decoration: const InputDecoration(
                          hintText: 'Type your message...',
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        maxLines: null,
                        onChanged: _onTyping,
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _isSending ? null : _sendMessage,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _messageController.text.trim().isEmpty
                            ? AppColors.textSecondary
                            : AppColors.primary,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: _isSending
                          ? const Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              ),
                            )
                          : const Icon(
                              Icons.send,
                              color: Colors.white,
                              size: 20,
                            ),
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

  Widget _buildMessageBubble(Map<String, dynamic> message, int index) {
    final isMe = message['isMe'] as bool;
    final text = message['text'] as String;
    final timestamp = message['timestamp'] as DateTime;
    final isRead = message['isRead'] as bool? ?? false;

    // Check if we should show timestamp
    bool showTimestamp = false;
    if (index == 0) {
      showTimestamp = true;
    } else {
      final prevMessage = _messages[index - 1];
      final prevTimestamp = prevMessage['timestamp'] as DateTime;
      final timeDiff = timestamp.difference(prevTimestamp).inMinutes;
      showTimestamp = timeDiff > 15; // Show timestamp if more than 15 minutes apart
    }

    return Column(
      children: [
        if (showTimestamp)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.textSecondary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                _formatTimestamp(timestamp),
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!isMe) ...[
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    Icons.person,
                    color: AppColors.primary,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 8),
              ],
              
              Flexible(
                child: Container(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.75,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isMe ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 5,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        text,
                        style: TextStyle(
                          color: isMe ? Colors.white : AppColors.textPrimary,
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _formatMessageTime(timestamp),
                            style: TextStyle(
                              color: isMe 
                                  ? Colors.white.withOpacity(0.7)
                                  : AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                          if (isMe) ...[
                            const SizedBox(width: 4),
                            Icon(
                              isRead ? Icons.done_all : Icons.done,
                              size: 14,
                              color: isRead 
                                  ? Colors.blue[300]
                                  : Colors.white.withOpacity(0.7),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              
              if (isMe) ...[
                const SizedBox(width: 8),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    Icons.person,
                    color: AppColors.success,
                    size: 16,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  void _onTyping(String text) {
    setState(() {});
    
    // Simulate doctor typing indicator
    if (text.isNotEmpty && !_isTyping) {
      setState(() {
        _isTyping = true;
      });
      
      _typingTimer = Timer(const Duration(seconds: 3), () {
        setState(() {
          _isTyping = false;
        });
      });
    }
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() {
      _isSending = true;
    });

    // Add message to list
    final newMessage = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'text': text,
      'isMe': true,
      'timestamp': DateTime.now(),
      'isRead': false,
    };

    setState(() {
      _messages.add(newMessage);
      _messageController.clear();
      _isSending = false;
    });

    // Scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollToBottom();
    });

    // Simulate doctor response after delay
    Future.delayed(const Duration(seconds: 2), () {
      _simulateDoctorResponse(text);
    });
  }

  void _simulateDoctorResponse(String userMessage) {
    String response = "Thank you for sharing that information. Let me review your symptoms and get back to you shortly.";
    
    // Simple response logic based on user message
    if (userMessage.toLowerCase().contains('pain') || 
        userMessage.toLowerCase().contains('hurt')) {
      response = "I understand you're experiencing pain. Can you rate it on a scale of 1-10? This will help me better assess your condition.";
    } else if (userMessage.toLowerCase().contains('headache')) {
      response = "For tension headaches, try taking regular breaks from screen time every 20-30 minutes. Also, ensure you're staying hydrated and getting adequate sleep.";
    } else if (userMessage.toLowerCase().contains('medication') || 
               userMessage.toLowerCase().contains('prescription')) {
      response = "Regarding your medication, please make sure to take it as prescribed. If you're experiencing any side effects, let me know immediately.";
    }

    final doctorMessage = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'text': response,
      'isMe': false,
      'timestamp': DateTime.now(),
      'isRead': true,
    };

    setState(() {
      _messages.add(doctorMessage);
      _isTyping = false;
    });

    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollToBottom();
    });
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Send Attachment',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildAttachmentOption(
                  Icons.photo_camera,
                  'Camera',
                  () => _handleAttachment('camera'),
                ),
                _buildAttachmentOption(
                  Icons.photo_library,
                  'Gallery',
                  () => _handleAttachment('gallery'),
                ),
                _buildAttachmentOption(
                  Icons.description,
                  'Document',
                  () => _handleAttachment('document'),
                ),
                _buildAttachmentOption(
                  Icons.location_on,
                  'Location',
                  () => _handleAttachment('location'),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachmentOption(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Icon(
              icon,
              color: AppColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  void _handleAttachment(String type) {
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$type attachment feature coming soon'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _startVideoCall() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Starting video call with Dr. ${widget.doctorName ?? 'Healthcare Provider'}...'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  void _startVoiceCall() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Starting voice call with Dr. ${widget.doctorName ?? 'Healthcare Provider'}...'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  void _handleMenuAction(String action) {
    switch (action) {
      case 'clear':
        _clearChat();
        break;
      case 'export':
        _exportChat();
        break;
    }
  }

  void _clearChat() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Chat'),
        content: const Text('Are you sure you want to clear all messages? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _messages.clear();
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Chat cleared'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: Text(
              'Clear',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  void _exportChat() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Exporting chat history...'),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inDays == 0) {
      return 'Today ${_formatTime(timestamp)}';
    } else if (difference.inDays == 1) {
      return 'Yesterday ${_formatTime(timestamp)}';
    } else if (difference.inDays < 7) {
      return '${_getDayName(timestamp.weekday)} ${_formatTime(timestamp)}';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }

  String _formatMessageTime(DateTime timestamp) {
    return _formatTime(timestamp);
  }

  String _formatTime(DateTime timestamp) {
    final hour = timestamp.hour.toString().padLeft(2, '0');
    final minute = timestamp.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _getDayName(int weekday) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[weekday - 1];
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _typingTimer?.cancel();
    super.dispose();
  }
}
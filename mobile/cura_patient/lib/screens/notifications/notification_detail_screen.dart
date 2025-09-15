import 'package:flutter/material.dart';

class NotificationDetailScreen extends StatelessWidget {
  const NotificationDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NotificationDetailScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for NotificationDetailScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - getNotifications() // GET /notifications
// - markNotificationAsRead(int notificationId) // PUT /notifications/{id}/read
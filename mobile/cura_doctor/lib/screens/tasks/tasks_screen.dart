import 'package:flutter/material.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tasks')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for TasksScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: listNotifications, markNotificationRead'),
          ],
        ),
      ),
    );
  }
}
import 'package:flutter/material.dart';

class ChangePasswordScreen extends StatelessWidget {
  const ChangePasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for ChangePasswordScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: changePassword'),
          ],
        ),
      ),
    );
  }
}
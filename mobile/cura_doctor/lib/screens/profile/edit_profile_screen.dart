import 'package:flutter/material.dart';

class EditProfileScreen extends StatelessWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for EditProfileScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: updateDoctorProfile, getDoctorProfile'),
          ],
        ),
      ),
    );
  }
}
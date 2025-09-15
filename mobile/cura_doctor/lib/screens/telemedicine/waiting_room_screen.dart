import 'package:flutter/material.dart';

class WaitingRoomScreen extends StatelessWidget {
  const WaitingRoomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Waiting Room')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for WaitingRoomScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: listDoctorAppointments, joinVideoSession'),
          ],
        ),
      ),
    );
  }
}
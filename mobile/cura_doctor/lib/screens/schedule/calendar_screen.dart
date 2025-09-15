import 'package:flutter/material.dart';

class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Calendar')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for CalendarScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: listDoctorAppointments, getAvailability'),
          ],
        ),
      ),
    );
  }
}
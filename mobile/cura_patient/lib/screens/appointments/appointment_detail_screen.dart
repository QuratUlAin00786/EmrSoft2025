import 'package:flutter/material.dart';

class AppointmentDetailScreen extends StatelessWidget {
  const AppointmentDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AppointmentDetailScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for AppointmentDetailScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - getAppointment(String id) // GET /api/appointments/{id}
// - cancelAppointment(String id, String reason) // POST /api/appointments/{id}/cancel
// - rescheduleAppointment(String id, String newSlotId) // POST /api/appointments/{id}/reschedule
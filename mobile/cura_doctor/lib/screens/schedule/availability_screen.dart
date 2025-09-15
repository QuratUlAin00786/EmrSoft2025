import 'package:flutter/material.dart';

class AvailabilityScreen extends StatelessWidget {
  const AvailabilityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Availability')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for AvailabilityScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: getAvailability, updateAvailability'),
          ],
        ),
      ),
    );
  }
}
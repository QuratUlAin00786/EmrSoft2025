import 'package:flutter/material.dart';

class VitalsEntryScreen extends StatelessWidget {
  const VitalsEntryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vitals Entry')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for VitalsEntryScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: addVitals'),
          ],
        ),
      ),
    );
  }
}
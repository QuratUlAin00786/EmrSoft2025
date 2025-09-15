import 'package:flutter/material.dart';

class DiagnosisScreen extends StatelessWidget {
  const DiagnosisScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnosis')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for DiagnosisScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: addDiagnosis, getEncounter'),
          ],
        ),
      ),
    );
  }
}
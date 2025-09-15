import 'package:flutter/material.dart';

class EncounterNoteScreen extends StatelessWidget {
  const EncounterNoteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Encounter Note')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for EncounterNoteScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: createEncounter, updateEncounter, getEncounter'),
          ],
        ),
      ),
    );
  }
}
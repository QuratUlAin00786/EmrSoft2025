import 'package:flutter/material.dart';

class DependentsScreen extends StatelessWidget {
  const DependentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DependentsScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for DependentsScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - listDependents() // GET /api/patient/dependents
// - createDependent(Map<String,dynamic> body) // POST /api/patient/dependents
// - updateDependent(String id, Map<String,dynamic> body) // PUT /api/patient/dependents/{id}
// - deleteDependent(String id) // DELETE /api/patient/dependents/{id}
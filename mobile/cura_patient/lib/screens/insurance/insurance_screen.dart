import 'package:flutter/material.dart';

class InsuranceScreen extends StatelessWidget {
  const InsuranceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('InsuranceScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for InsuranceScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - listPolicies() // GET /api/insurance/policies
// - createPolicy(Map<String,dynamic> body) // POST /api/insurance/policies
// - updatePolicy(String id, Map<String,dynamic> body) // PUT /api/insurance/policies/{id}
// - deletePolicy(String id) // DELETE /api/insurance/policies/{id}
import 'package:flutter/material.dart';

class OrderLabTestScreen extends StatelessWidget {
  const OrderLabTestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('OrderLabTestScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for OrderLabTestScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - listLabCatalog() // GET /api/labs/catalog
// - createLabOrder(Map<String,dynamic> body) // POST /api/labs/orders
// - getLabOrder(String id) // GET /api/labs/orders/{id}
// - cancelLabOrder(String id) // POST /api/labs/orders/{id}/cancel
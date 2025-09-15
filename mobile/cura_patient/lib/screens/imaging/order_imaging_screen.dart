import 'package:flutter/material.dart';

class OrderImagingScreen extends StatelessWidget {
  const OrderImagingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('OrderImagingScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for OrderImagingScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - listImagingCatalog() // GET /api/imaging/catalog
// - createImagingOrder(Map<String,dynamic> body) // POST /api/imaging/orders
// - getImagingOrder(String id) // GET /api/imaging/orders/{id}
// - cancelImagingOrder(String id) // POST /api/imaging/orders/{id}/cancel
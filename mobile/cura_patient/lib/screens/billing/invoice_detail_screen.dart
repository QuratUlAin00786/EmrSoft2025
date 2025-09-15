import 'package:flutter/material.dart';

class InvoiceDetailScreen extends StatelessWidget {
  const InvoiceDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('InvoiceDetailScreen')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI fields & actions for InvoiceDetailScreen'),
            SizedBox(height: 12),
            Text('Expected API calls: see comments at top of file.'),
          ],
        ),
      ),
    );
  }
}
// Expected API calls (implementations in ApiService):
// - listInvoices() // GET /api/billing/invoices
// - getInvoice(String id) // GET /api/billing/invoices/{id}
// - payInvoice(String id, Map<String,dynamic> payment) // POST /api/billing/invoices/{id}/pay
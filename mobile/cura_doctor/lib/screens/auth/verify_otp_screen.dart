import 'package:flutter/material.dart';

class VerifyOTPScreen extends StatelessWidget {
  const VerifyOTPScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('TODO: UI for VerifyOTPScreen'),
            SizedBox(height: 8),
            Text('Expected API calls: docVerifyOtp'),
          ],
        ),
      ),
    );
  }
}
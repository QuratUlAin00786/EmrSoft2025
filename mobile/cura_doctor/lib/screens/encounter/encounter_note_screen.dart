import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class EncounterNoteScreen extends StatefulWidget {
  final String? encounterId;
  final String patientId;
  final String? appointmentId;

  const EncounterNoteScreen({
    super.key,
    this.encounterId,
    required this.patientId,
    this.appointmentId,
  });

  @override
  State<EncounterNoteScreen> createState() => _EncounterNoteScreenState();
}

class _EncounterNoteScreenState extends State<EncounterNoteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _chiefComplaintController = TextEditingController();
  final _subjectiveController = TextEditingController();
  final _objectiveController = TextEditingController();
  final _assessmentController = TextEditingController();
  final _planController = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _encounterData;

  @override
  void initState() {
    super.initState();
    if (widget.encounterId != null) {
      _loadEncounter();
    }
  }

  Future<void> _loadEncounter() async {
    try {
      setState(() => _isLoading = true);
      final encounter = await ApiService.getEncounter(widget.encounterId!);
      setState(() {
        _encounterData = encounter;
        _chiefComplaintController.text = encounter['chiefComplaint'] ?? '';
        final soap = encounter['soap'] ?? {};
        _subjectiveController.text = soap['s'] ?? '';
        _objectiveController.text = soap['o'] ?? '';
        _assessmentController.text = soap['a'] ?? '';
        _planController.text = soap['p'] ?? '';
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading encounter: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveEncounter() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      setState(() => _isLoading = true);
      
      final encounterData = {
        'patientId': widget.patientId,
        'appointmentId': widget.appointmentId,
        'chiefComplaint': _chiefComplaintController.text,
        'soap': {
          's': _subjectiveController.text,
          'o': _objectiveController.text,
          'a': _assessmentController.text,
          'p': _planController.text,
        }
      };

      if (widget.encounterId != null) {
        await ApiService.updateEncounter(widget.encounterId!, encounterData);
      } else {
        await ApiService.createEncounter(encounterData);
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Encounter ${widget.encounterId != null ? 'updated' : 'created'} successfully')),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving encounter: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.encounterId != null ? 'Edit Encounter' : 'New Encounter'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveEncounter,
            child: _isLoading
                ? const CircularProgressIndicator()
                : const Text('Save'),
          ),
        ],
      ),
      body: _isLoading && _encounterData == null
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Chief Complaint',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _chiefComplaintController,
                              maxLines: 2,
                              decoration: const InputDecoration(
                                hintText: 'Patient\'s main concern...',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) => value?.isEmpty == true ? 'Required' : null,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'SOAP Notes',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _subjectiveController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Subjective',
                                hintText: 'Patient history, symptoms, concerns...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _objectiveController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Objective',
                                hintText: 'Physical examination findings, vitals...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _assessmentController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Assessment',
                                hintText: 'Clinical impression, diagnosis...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _planController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                labelText: 'Plan',
                                hintText: 'Treatment plan, next steps...',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  @override
  void dispose() {
    _chiefComplaintController.dispose();
    _subjectiveController.dispose();
    _objectiveController.dispose();
    _assessmentController.dispose();
    _planController.dispose();
    super.dispose();
  }
}
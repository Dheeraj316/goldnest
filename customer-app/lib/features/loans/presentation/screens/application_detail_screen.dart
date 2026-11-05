import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/loan_application.dart';

class ApplicationDetailScreen extends StatelessWidget {
  const ApplicationDetailScreen({super.key, required this.application, this.justSubmitted = false});

  final LoanApplication application;
  final bool justSubmitted;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(application.applicationNumber)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (justSubmitted)
            Container(
              margin: const EdgeInsets.only(bottom: 20),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(14)),
              child: const Row(
                children: [
                  Icon(Icons.check_circle_rounded, color: AppColors.emerald500),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Application submitted! We'll notify you once your branch confirms your appointment.",
                      style: TextStyle(color: AppColors.emerald500, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(application.productName, style: AppTheme.display(size: 18))),
                      StatusBadge(status: application.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(application.applicationNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                  const Divider(height: 32),
                  _Row(label: 'Requested amount', value: '₹${application.requestedAmount.toStringAsFixed(0)}'),
                  _Row(label: 'Tenure', value: '${application.requestedTenureDays} days'),
                  _Row(label: 'Branch', value: application.branchName),
                  if (application.purpose != null && application.purpose!.isNotEmpty)
                    _Row(label: 'Purpose', value: application.purpose!),
                  _Row(label: 'Submitted', value: _formatDate(application.submittedAt)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const _StatusExplainer(),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) => '${date.day}/${date.month}/${date.year}';
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
          const SizedBox(width: 16),
          Flexible(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }
}

class _StatusExplainer extends StatelessWidget {
  const _StatusExplainer();

  static const _steps = [
    ('SUBMITTED', 'Received — waiting for your branch to confirm and start appraisal.'),
    ('APPRAISAL_PENDING', 'A branch appraiser is valuing your gold.'),
    ('APPROVAL_PENDING', 'Waiting on a second sign-off before disbursal.'),
    ('APPROVED', 'Approved — your branch will schedule disbursal.'),
    ('ACTIVE', 'Disbursed — funds are in your account and your loan is live.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('What happens next', style: AppTheme.display(size: 15)),
            const SizedBox(height: 12),
            ..._steps.map(
              (s) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 4),
                      child: Icon(Icons.circle, size: 6, color: AppColors.gold500),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(s.$2, style: const TextStyle(fontSize: 13, color: AppColors.inkLight))),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

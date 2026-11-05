import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/application_detail.dart';
import '../providers/loans_providers.dart';
import 'loan_detail_screen.dart';

class ApplicationDetailScreen extends ConsumerStatefulWidget {
  const ApplicationDetailScreen({super.key, required this.applicationId});

  final String applicationId;

  @override
  ConsumerState<ApplicationDetailScreen> createState() => _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends ConsumerState<ApplicationDetailScreen> {
  bool _isSubmitting = false;
  String? _error;

  Future<void> _startAppraisal() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await ref.read(loansRepositoryProvider).startAppraisal(widget.applicationId);
      ref.invalidate(applicationDetailProvider(widget.applicationId));
      ref.invalidate(applicationsProvider(null));
      ref.invalidate(applicationsProvider('SUBMITTED'));
      ref.invalidate(pendingApplicationsCountProvider);
      ref.invalidate(loansAwaitingAppraisalCountProvider);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(applicationDetailProvider(widget.applicationId));

    return Scaffold(
      appBar: AppBar(title: const Text('Application')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(applicationDetailProvider(widget.applicationId)), child: const Text('Could not load. Tap to retry.'))),
        data: (app) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text(app.customer.fullName, style: AppTheme.display(size: 18))),
                        StatusBadge(status: app.status),
                      ],
                    ),
                    Text(app.customer.customerCode, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                    const Divider(height: 32),
                    _row('Application', app.applicationNumber),
                    _row('Product', app.productName),
                    _row('Requested amount', '₹${app.requestedAmount.toStringAsFixed(0)}'),
                    _row('Tenure', '${app.requestedTenureDays} days'),
                    _row('Branch', '${app.branchName} (${app.branchCode})'),
                    _row('Customer mobile', app.customer.mobile),
                    if (app.customer.kycStatus != null) _row('KYC status', app.customer.kycStatus!),
                    if (app.purpose != null && app.purpose!.isNotEmpty) _row('Purpose', app.purpose!),
                    _row('Submitted', _date(app.submittedAt)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (app.status == 'SUBMITTED') ...[
              if (app.customer.kycStatus != 'VERIFIED')
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFFFDF4E3), borderRadius: BorderRadius.circular(12)),
                  child: const Text(
                    "This customer's KYC isn't verified yet — appraisal can't start until it is.",
                    style: TextStyle(color: Color(0xFF8A6A1F), fontSize: 13),
                  ),
                ),
              if (app.customer.kycStatus == 'VERIFIED') ...[
                if (_error != null) ...[
                  Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
                  const SizedBox(height: 12),
                ],
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _startAppraisal,
                  child: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : const Text('Start Appraisal'),
                ),
              ],
            ] else if (app.loanId != null)
              ElevatedButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => LoanDetailScreen(loanId: app.loanId!))),
                child: const Text('View Loan'),
              ),
            const SizedBox(height: 16),
            _TimelineCard(app: app),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
          Flexible(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }

  String _date(DateTime d) => '${d.day}/${d.month}/${d.year}';
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.app});
  final ApplicationDetail app;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status timeline', style: AppTheme.display(size: 15)),
            const SizedBox(height: 12),
            ...app.statusHistory.map(
              (event) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(padding: EdgeInsets.only(top: 4), child: Icon(Icons.circle, size: 8, color: AppColors.gold500)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(event.toStatus.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          if (event.reason != null && event.reason!.isNotEmpty) Text(event.reason!, style: const TextStyle(fontSize: 12, color: AppColors.inkLight)),
                        ],
                      ),
                    ),
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

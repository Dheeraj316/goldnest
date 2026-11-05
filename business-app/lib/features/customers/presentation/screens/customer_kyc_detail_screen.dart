import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../loans/presentation/providers/loans_providers.dart';
import '../../domain/kyc_record.dart';
import '../providers/customers_providers.dart';

class CustomerKycDetailScreen extends ConsumerStatefulWidget {
  const CustomerKycDetailScreen({super.key, required this.customerId});

  final String customerId;

  @override
  ConsumerState<CustomerKycDetailScreen> createState() => _CustomerKycDetailScreenState();
}

class _CustomerKycDetailScreenState extends ConsumerState<CustomerKycDetailScreen> {
  bool _isBusy = false;
  String? _error;

  void _refresh() {
    ref.invalidate(customerDetailProvider(widget.customerId));
    ref.invalidate(customersSearchProvider(null));
    ref.invalidate(customersSearchProvider('IN_REVIEW'));
    ref.invalidate(customersSearchProvider('PENDING'));
    ref.invalidate(customersSearchProvider('VERIFIED'));
    ref.invalidate(customersSearchProvider('REJECTED'));
    ref.invalidate(kycQueueCountProvider);
    ref.invalidate(pendingApplicationsCountProvider);
  }

  Future<void> _decide(String kycRecordId, String decision, {String? rejectionReason}) async {
    setState(() {
      _isBusy = true;
      _error = null;
    });
    try {
      await ref.read(customersRepositoryProvider).reviewKyc(kycRecordId, decision: decision, rejectionReason: rejectionReason);
      _refresh();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _confirmReject(String kycRecordId) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject this document?'),
        content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'Reason (optional)'), maxLines: 2),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Reject')),
        ],
      ),
    );
    if (reason != null) _decide(kycRecordId, 'REJECTED', rejectionReason: reason);
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(customerDetailProvider(widget.customerId));

    return Scaffold(
      appBar: AppBar(title: const Text('Customer KYC')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(customerDetailProvider(widget.customerId)), child: const Text('Could not load. Tap to retry.'))),
        data: (customer) => ListView(
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
                        Expanded(child: Text(customer.fullName, style: AppTheme.display(size: 18))),
                        StatusBadge(status: customer.kycStatus),
                      ],
                    ),
                    Text('${customer.customerCode} · ${customer.mobile}', style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                    if (customer.email != null) Text(customer.email!, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                    if (customer.addresses.isNotEmpty) Text(customer.addresses.first.formatted, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFFDF2F4), borderRadius: BorderRadius.circular(10)),
                child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
              ),
              const SizedBox(height: 16),
            ],
            Text('Documents submitted', style: AppTheme.display(size: 15)),
            const SizedBox(height: 10),
            if (customer.kycRecords.isEmpty) const Text('No documents submitted yet.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
            for (final record in customer.kycRecords) _KycRecordCard(record: record, isBusy: _isBusy, onApprove: () => _decide(record.id, 'VERIFIED'), onReject: () => _confirmReject(record.id)),
          ],
        ),
      ),
    );
  }
}

class _KycRecordCard extends StatelessWidget {
  const _KycRecordCard({required this.record, required this.isBusy, required this.onApprove, required this.onReject});

  final KycRecord record;
  final bool isBusy;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(record.docType.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                StatusBadge(status: record.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(record.maskedNumber, style: const TextStyle(fontSize: 13, color: AppColors.inkLight, letterSpacing: 1)),
            if (record.rejectionReason != null && record.rejectionReason!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Rejected: ${record.rejectionReason}', style: const TextStyle(fontSize: 12, color: AppColors.rose500)),
            ],
            if (record.status == 'PENDING') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: OutlinedButton(onPressed: isBusy ? null : onReject, child: const Text('Reject'))),
                  const SizedBox(width: 12),
                  Expanded(child: ElevatedButton(onPressed: isBusy ? null : onApprove, child: const Text('Verify'))),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

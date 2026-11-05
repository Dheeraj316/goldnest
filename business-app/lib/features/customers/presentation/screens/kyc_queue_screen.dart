import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/customer_list_item.dart';
import '../providers/customers_providers.dart';
import 'customer_kyc_detail_screen.dart';

class KycQueueScreen extends ConsumerStatefulWidget {
  const KycQueueScreen({super.key});

  @override
  ConsumerState<KycQueueScreen> createState() => _KycQueueScreenState();
}

class _KycQueueScreenState extends ConsumerState<KycQueueScreen> {
  String? _status = 'IN_REVIEW';

  static const _statusOptions = ['IN_REVIEW', 'PENDING', 'VERIFIED', 'REJECTED', null];
  static const _statusLabels = {'IN_REVIEW': 'In review', 'PENDING': 'Pending', 'VERIFIED': 'Verified', 'REJECTED': 'Rejected'};

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersSearchProvider(_status));

    return Scaffold(
      appBar: AppBar(title: const Text('Customer KYC')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _statusOptions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final status = _statusOptions[index];
                final selected = status == _status;
                return ChoiceChip(
                  label: Text(status == null ? 'All' : (_statusLabels[status] ?? status)),
                  selected: selected,
                  onSelected: (_) => setState(() => _status = status),
                );
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(customersSearchProvider(_status)),
              child: customersAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(customersSearchProvider(_status)), child: const Text('Could not load. Tap to retry.'))),
                data: (customers) {
                  if (customers.isEmpty) {
                    return const Center(child: Text('No customers here.', style: TextStyle(color: AppColors.inkLight)));
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: customers.length,
                    itemBuilder: (context, index) => _CustomerTile(customer: customers[index]),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomerTile extends StatelessWidget {
  const _CustomerTile({required this.customer});
  final CustomerListItem customer;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CustomerKycDetailScreen(customerId: customer.id))),
        title: Text(customer.fullName),
        subtitle: Text('${customer.customerCode} · ${customer.mobile}'),
        trailing: StatusBadge(status: customer.kycStatus),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/staff_loan_application.dart';
import '../providers/loans_providers.dart';
import 'application_detail_screen.dart';

class ApplicationsListScreen extends ConsumerStatefulWidget {
  const ApplicationsListScreen({super.key, this.initialStatus});

  final String? initialStatus;

  @override
  ConsumerState<ApplicationsListScreen> createState() => _ApplicationsListScreenState();
}

class _ApplicationsListScreenState extends ConsumerState<ApplicationsListScreen> {
  String? _status;

  static const _statusOptions = [null, 'SUBMITTED', 'APPRAISAL_PENDING', 'APPROVAL_PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'CLOSED'];

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
  }

  @override
  Widget build(BuildContext context) {
    final applicationsAsync = ref.watch(applicationsProvider(_status));

    return Scaffold(
      appBar: AppBar(title: const Text('Applications')),
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
                  label: Text(status ?? 'All'),
                  selected: selected,
                  onSelected: (_) => setState(() => _status = status),
                );
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(applicationsProvider(_status)),
              child: applicationsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(applicationsProvider(_status)), child: const Text('Could not load. Tap to retry.'))),
                data: (apps) {
                  if (apps.isEmpty) {
                    return const Center(child: Text('No applications here.', style: TextStyle(color: AppColors.inkLight)));
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: apps.length,
                    itemBuilder: (context, index) => _ApplicationTile(application: apps[index]),
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

class _ApplicationTile extends StatelessWidget {
  const _ApplicationTile({required this.application});
  final StaffLoanApplication application;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ApplicationDetailScreen(applicationId: application.id))),
        title: Text('${application.customer.fullName} · ₹${application.requestedAmount.toStringAsFixed(0)}'),
        subtitle: Text('${application.applicationNumber} · ${application.productName}'),
        trailing: StatusBadge(status: application.status),
      ),
    );
  }
}

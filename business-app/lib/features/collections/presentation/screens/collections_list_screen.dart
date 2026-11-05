import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/collection_case.dart';
import '../providers/collections_providers.dart';
import 'collection_case_detail_screen.dart';

class CollectionsListScreen extends ConsumerStatefulWidget {
  const CollectionsListScreen({super.key, this.initialFilter = CaseFilter.mine});

  final CaseFilter initialFilter;

  @override
  ConsumerState<CollectionsListScreen> createState() => _CollectionsListScreenState();
}

class _CollectionsListScreenState extends ConsumerState<CollectionsListScreen> {
  late CaseFilter _filter = widget.initialFilter;

  static const _labels = {CaseFilter.mine: 'Assigned to me', CaseFilter.open: 'All open', CaseFilter.closed: 'Closed'};

  @override
  Widget build(BuildContext context) {
    final casesAsync = ref.watch(collectionCasesProvider(_filter));

    return Scaffold(
      appBar: AppBar(title: const Text('Collections')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: CaseFilter.values.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final f = CaseFilter.values[index];
                return ChoiceChip(label: Text(_labels[f]!), selected: f == _filter, onSelected: (_) => setState(() => _filter = f));
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(collectionCasesProvider(_filter)),
              child: casesAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: TextButton(onPressed: () => ref.invalidate(collectionCasesProvider(_filter)), child: const Text('Could not load. Tap to retry.'))),
                data: (cases) {
                  if (cases.isEmpty) {
                    return ListView(children: const [SizedBox(height: 120), Center(child: Text('No cases here.', style: TextStyle(color: AppColors.inkLight)))]);
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: cases.length,
                    itemBuilder: (context, index) => _CaseTile(item: cases[index], onReturn: () => ref.invalidate(collectionCasesProvider(_filter))),
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

class _CaseTile extends StatelessWidget {
  const _CaseTile({required this.item, required this.onReturn});

  final CollectionCaseSummary item;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final severe = item.daysPastDue >= 7;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => CollectionCaseDetailScreen(caseId: item.id)));
          onReturn();
        },
        title: Text('${item.customerName} · ₹${item.principalAmount.toStringAsFixed(0)}'),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            [
              '${item.caseNumber} · ${item.loanNumber}',
              if (item.assigneeName == null && item.status == 'OPEN') 'Unassigned',
              if (item.nextPromiseAmount != null) 'Promised ₹${item.nextPromiseAmount!.toStringAsFixed(0)} by ${formatDay(item.nextPromiseDate!)}',
              if (item.status == 'CLOSED' && item.closeReason != null) item.closeReason!,
            ].join('\n'),
          ),
        ),
        isThreeLine: true,
        trailing: item.status == 'OPEN'
            ? Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: severe ? const Color(0xFFFDF2F4) : AppColors.gold50, borderRadius: BorderRadius.circular(999)),
                child: Text(
                  '${item.daysPastDue}d late',
                  style: TextStyle(color: severe ? AppColors.rose500 : AppColors.gold700, fontSize: 12, fontWeight: FontWeight.w700),
                ),
              )
            : null,
      ),
    );
  }
}

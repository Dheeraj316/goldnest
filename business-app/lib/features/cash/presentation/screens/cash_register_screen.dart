import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/cash_entry.dart';
import '../providers/cash_providers.dart';

const _entryTypes = <(String, String)>[('RECEIPT', 'Receipt'), ('DISBURSEMENT', 'Disbursement'), ('TRANSFER', 'Transfer')];

class CashRegisterScreen extends ConsumerWidget {
  const CashRegisterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todayAsync = ref.watch(todayCashProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Cash Register')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(todayCashProvider),
        child: todayAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          error: (error, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
                child: Column(
                  children: [
                    Text(error is ApiException ? error.message : 'Could not load the register.', style: const TextStyle(color: AppColors.rose500, fontSize: 13), textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    TextButton(onPressed: () => ref.invalidate(todayCashProvider), child: const Text('Try again')),
                  ],
                ),
              ),
            ],
          ),
          data: (summary) => _CashBody(summary: summary),
        ),
      ),
    );
  }
}

class _CashBody extends ConsumerStatefulWidget {
  const _CashBody({required this.summary});
  final CashDaySummary summary;

  @override
  ConsumerState<_CashBody> createState() => _CashBodyState();
}

class _CashBodyState extends ConsumerState<_CashBody> {
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();
  String _entryType = 'RECEIPT';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  double? get _amount => double.tryParse(_amountController.text.trim());

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      ref.invalidate(todayCashProvider);
      _amountController.clear();
      _referenceController.clear();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.summary;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(s.date, style: AppTheme.display(size: 17)),
                const SizedBox(height: 6),
                Text(
                  s.isClosed ? 'Closed for the day' : (s.isOpen ? 'Open' : 'Not opened yet'),
                  style: const TextStyle(color: AppColors.inkLight, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text('Expected balance ₹${s.expectedBalance}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (s.isClosed)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text('Nothing more to do — today is closed.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
            ),
          )
        else if (!s.isOpen)
          _OpenCard(busy: _busy, error: _error, amountController: _amountController, onOpen: (amount) => _run(() => ref.read(cashRepositoryProvider).open(amount)))
        else
          _ActiveCard(
            busy: _busy,
            error: _error,
            entryType: _entryType,
            onEntryType: (v) => setState(() => _entryType = v),
            amountController: _amountController,
            referenceController: _referenceController,
            onRecord: () {
              final amount = _amount;
              if (amount == null || amount <= 0) {
                setState(() => _error = 'Enter an amount.');
                return;
              }
              _run(() => ref.read(cashRepositoryProvider).recordEntry(type: _entryType, amount: amount, reference: _referenceController.text.trim()));
            },
            expectedBalance: s.expectedBalance,
            onClose: (counted) => _run(() => ref.read(cashRepositoryProvider).close(amount: counted, reference: 'Counted at close')),
          ),
        const SizedBox(height: 24),
        Text('Today\'s entries', style: AppTheme.display(size: 16)),
        const SizedBox(height: 8),
        if (s.entries.isEmpty)
          const Card(
            child: Padding(padding: EdgeInsets.all(20), child: Text('Nothing recorded yet.', style: TextStyle(color: AppColors.inkLight, fontSize: 13))),
          )
        else
          ...s.entries.map(
            (e) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: StatusBadge(status: e.type),
                title: Text('₹${e.amount}', style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(e.reference ?? '—'),
                trailing: Text(TimeOfDay.fromDateTime(e.createdAt.toLocal()).format(context), style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
              ),
            ),
          ),
      ],
    );
  }
}

class _OpenCard extends StatelessWidget {
  const _OpenCard({required this.busy, required this.error, required this.amountController, required this.onOpen});
  final bool busy;
  final String? error;
  final TextEditingController amountController;
  final void Function(double amount) onOpen;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Open the register', style: AppTheme.display(size: 16)),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Opening float', border: OutlineInputBorder()),
            ),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: busy
                    ? null
                    : () {
                        final v = double.tryParse(amountController.text.trim());
                        if (v == null || v <= 0) return;
                        onOpen(v);
                      },
                child: Text(busy ? 'Opening…' : 'Open register'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActiveCard extends StatefulWidget {
  const _ActiveCard({
    required this.busy,
    required this.error,
    required this.entryType,
    required this.onEntryType,
    required this.amountController,
    required this.referenceController,
    required this.onRecord,
    required this.expectedBalance,
    required this.onClose,
  });
  final bool busy;
  final String? error;
  final String entryType;
  final ValueChanged<String> onEntryType;
  final TextEditingController amountController;
  final TextEditingController referenceController;
  final VoidCallback onRecord;
  final String expectedBalance;
  final void Function(double counted) onClose;

  @override
  State<_ActiveCard> createState() => _ActiveCardState();
}

class _ActiveCardState extends State<_ActiveCard> {
  late final _countedController = TextEditingController(text: widget.expectedBalance);

  @override
  void didUpdateWidget(covariant _ActiveCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.expectedBalance != widget.expectedBalance && !widget.busy) {
      _countedController.text = widget.expectedBalance;
    }
  }

  @override
  void dispose() {
    _countedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Record an entry', style: AppTheme.display(size: 16)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: widget.entryType,
                  decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                  items: _entryTypes.map((t) => DropdownMenuItem(value: t.$1, child: Text(t.$2))).toList(),
                  onChanged: (v) => widget.onEntryType(v ?? widget.entryType),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: widget.amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: widget.referenceController,
                  decoration: const InputDecoration(labelText: 'Reference (optional)', border: OutlineInputBorder()),
                ),
                if (widget.error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(widget.error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(onPressed: widget.busy ? null : widget.onRecord, child: Text(widget.busy ? '…' : 'Record entry')),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Close the register', style: AppTheme.display(size: 16)),
                const SizedBox(height: 4),
                Text('Expected ₹${widget.expectedBalance} — enter what was actually counted.', style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
                const SizedBox(height: 12),
                TextField(
                  controller: _countedController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Counted amount', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: widget.busy
                        ? null
                        : () {
                            final v = double.tryParse(_countedController.text.trim());
                            if (v == null) return;
                            widget.onClose(v);
                          },
                    child: Text(widget.busy ? 'Closing…' : 'Close register'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

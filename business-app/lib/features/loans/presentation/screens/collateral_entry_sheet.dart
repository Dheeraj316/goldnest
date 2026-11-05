import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/loans_repository.dart';

class _ItemRow {
  final itemTypeController = TextEditingController();
  final grossController = TextEditingController();
  final stoneController = TextEditingController(text: '0');
  final purityController = TextEditingController(text: '22');

  double get gross => double.tryParse(grossController.text.trim()) ?? 0;
  double get stone => double.tryParse(stoneController.text.trim()) ?? 0;
  double get net => (gross - stone).clamp(0, double.infinity);

  void dispose() {
    itemTypeController.dispose();
    grossController.dispose();
    stoneController.dispose();
    purityController.dispose();
  }
}

/// Records the gold items pledged for a loan — shown once a loan reaches
/// APPRAISAL_PENDING with no collateral recorded yet (see loans.service.ts#createCollateral).
class CollateralEntrySheet extends StatefulWidget {
  const CollateralEntrySheet({super.key, required this.loanId, required this.repository});

  final String loanId;
  final LoansRepository repository;

  @override
  State<CollateralEntrySheet> createState() => _CollateralEntrySheetState();
}

class _CollateralEntrySheetState extends State<CollateralEntrySheet> {
  final List<_ItemRow> _rows = [_ItemRow()];
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    for (final row in _rows) {
      row.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final items = <CollateralItemInput>[];
    for (final row in _rows) {
      if (row.itemTypeController.text.trim().isEmpty || row.gross <= 0) {
        setState(() => _error = 'Fill in item type and gross weight for every row.');
        return;
      }
      items.add(CollateralItemInput(
        itemType: row.itemTypeController.text.trim().toUpperCase(),
        grossWeight: row.gross,
        stoneWeight: row.stone,
        netWeight: row.net,
        purityKarat: double.tryParse(row.purityController.text.trim()) ?? 22,
      ));
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.createCollateral(widget.loanId, items);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Record pledged gold', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              const Text('Enter every item exactly as weighed in front of the customer.', style: TextStyle(color: AppColors.inkLight, fontSize: 12)),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: _rows.length,
                  itemBuilder: (context, index) => _buildRow(index),
                ),
              ),
              TextButton.icon(
                onPressed: () => setState(() => _rows.add(_ItemRow())),
                icon: const Icon(Icons.add),
                label: const Text('Add another item'),
              ),
              if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Save collateral'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(int index) {
    final row = _rows[index];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Item ${index + 1}', style: const TextStyle(fontWeight: FontWeight.w600)),
                if (_rows.length > 1)
                  IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => _rows.removeAt(index)..dispose()), padding: EdgeInsets.zero, constraints: const BoxConstraints()),
              ],
            ),
            const SizedBox(height: 8),
            TextField(controller: row.itemTypeController, decoration: const InputDecoration(labelText: 'Item type (e.g. NECKLACE, RING)')),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: TextField(controller: row.grossController, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Gross weight (g)'), onChanged: (_) => setState(() {}))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: row.stoneController, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Stone weight (g)'), onChanged: (_) => setState(() {}))),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: InputDecorator(
                    decoration: const InputDecoration(labelText: 'Net weight (g)'),
                    child: Text(row.net.toStringAsFixed(3)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: row.purityController, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Purity (karat)'))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

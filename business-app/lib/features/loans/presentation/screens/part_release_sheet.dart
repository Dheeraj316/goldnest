import 'package:flutter/material.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/loans_repository.dart';
import '../../domain/staff_loan_detail.dart';

/// Hands some pledged items back while the loan stays open — see
/// loans.service.ts#partReleaseCollateral. The rule mirrored here for the
/// preview: the gold that STAYS, re-valued at today's rate, must still support
/// the outstanding principal at the loan's approved LTV. The server re-checks
/// under a row lock, so this preview is guidance, never the decision.
class PartReleaseSheet extends StatefulWidget {
  const PartReleaseSheet({super.key, required this.loan, required this.repository});

  final StaffLoanDetail loan;
  final LoansRepository repository;

  @override
  State<PartReleaseSheet> createState() => _PartReleaseSheetState();
}

class _PledgedItem {
  const _PledgedItem(this.item, this.collateralCode);
  final CollateralItemDetail item;
  final String collateralCode;
}

class _PartReleaseSheetState extends State<PartReleaseSheet> {
  static const _activeCollateralStatuses = {'PENDING_APPRAISAL', 'APPRAISED', 'STORED'};

  final _rateController = TextEditingController();
  final _remarksController = TextEditingController();
  final _selected = <String>{};
  bool _isSubmitting = false;
  String? _error;

  late final List<_PledgedItem> _pledged = [
    for (final c in widget.loan.collaterals.where((c) => _activeCollateralStatuses.contains(c.status)))
      for (final i in c.items) _PledgedItem(i, c.collateralCode),
  ];

  @override
  void dispose() {
    _rateController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  double get _rate => double.tryParse(_rateController.text.trim()) ?? 0;
  double get _outstandingPrincipal => widget.loan.outstanding.principal;

  // Same rounding as the server: each item's value to 2 dp, then the LTV share to 2 dp.
  double _r2(double v) => (v * 100).round() / 100;

  List<_PledgedItem> get _staying => _pledged.where((p) => !_selected.contains(p.item.id)).toList();

  double get _stayingValuation => _staying.fold<double>(0, (sum, p) => sum + _r2(p.item.netWeight * p.item.purityKarat / 24 * _rate));
  double get _stayingEligible => _r2(_stayingValuation * widget.loan.approvedLtvPercent / 100);

  bool get _releasesEverything => _selected.length == _pledged.length;
  bool get _covered => _stayingEligible >= _outstandingPrincipal;
  bool get _canRelease => _selected.isNotEmpty && _rate > 0 && !_releasesEverything && _covered;

  String? get _blocker {
    if (_selected.isEmpty || _rate <= 0) return null;
    if (_releasesEverything) return 'Releasing every item is a closure — settle the balance and close the loan instead.';
    if (!_covered) return 'Would leave the loan under-secured — pay down principal first, or release fewer items.';
    return null;
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      await widget.repository.partReleaseCollateral(
        widget.loan.id,
        itemIds: _selected.toList(),
        goldRatePerGram: _rate,
        remarks: _remarksController.text.trim(),
      );
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
              const Text('Release pledged gold', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(widget.loan.loanNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  children: [
                    const Text(
                      'Hands the selected items back to the customer while the loan stays open. Allowed only if the gold that stays pledged, re-valued at today’s rate, still covers the outstanding principal at the approved LTV.',
                      style: TextStyle(fontSize: 12, color: AppColors.inkLight),
                    ),
                    const SizedBox(height: 12),
                    const Text('ITEMS TO HAND BACK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.inkLight, letterSpacing: 0.6)),
                    if (_pledged.isEmpty)
                      const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('No pledged items on this loan.', style: TextStyle(fontSize: 13)))
                    else
                      for (final p in _pledged)
                        CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          controlAffinity: ListTileControlAffinity.leading,
                          value: _selected.contains(p.item.id),
                          onChanged: (v) => setState(() => v == true ? _selected.add(p.item.id) : _selected.remove(p.item.id)),
                          title: Text(p.item.itemType, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          subtitle: Text('${p.collateralCode} · ${p.item.netWeight.toStringAsFixed(3)}g · ${p.item.purityKarat.toStringAsFixed(0)}K', style: const TextStyle(fontSize: 12)),
                        ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _rateController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '24k gold rate today (₹/gram)'),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: _remarksController, decoration: const InputDecoration(labelText: 'Remarks (optional)'), maxLines: 2),
                    const SizedBox(height: 16),
                    if (_rate > 0 && _selected.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: AppColors.navy900, borderRadius: BorderRadius.circular(14)),
                        child: Column(
                          children: [
                            _summaryRow('Gold staying pledged', '${_staying.length} item(s)'),
                            _summaryRow('Supports (${widget.loan.approvedLtvPercent.toStringAsFixed(0)}% LTV)', '₹${_stayingEligible.toStringAsFixed(2)}'),
                            _summaryRow('Outstanding principal', '₹${_outstandingPrincipal.toStringAsFixed(2)}'),
                            const SizedBox(height: 6),
                            Text(
                              _blocker ?? 'Still fully secured — release allowed.',
                              style: TextStyle(color: _blocker == null ? AppColors.emerald500 : AppColors.rose500, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: (_isSubmitting || !_canRelease) ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Release selected items'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12))),
          Text(value, style: const TextStyle(color: AppColors.gold300, fontWeight: FontWeight.w700, fontSize: 14)),
        ],
      ),
    );
  }
}

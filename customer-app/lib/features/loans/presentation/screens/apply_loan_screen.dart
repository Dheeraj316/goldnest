import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../domain/branch.dart';
import '../../domain/loan_product.dart';
import '../providers/loans_providers.dart';
import 'application_detail_screen.dart';

class ApplyLoanScreen extends ConsumerStatefulWidget {
  const ApplyLoanScreen({super.key});

  @override
  ConsumerState<ApplyLoanScreen> createState() => _ApplyLoanScreenState();
}

class _ApplyLoanScreenState extends ConsumerState<ApplyLoanScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _purposeController = TextEditingController();

  String? _productId;
  String? _branchId;
  int? _tenureDays;
  bool _isSubmitting = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  LoanProduct? _selectedProduct(List<LoanProduct> products) {
    if (_productId == null) return null;
    for (final p in products) {
      if (p.id == _productId) return p;
    }
    return null;
  }

  Future<void> _submit(LoanProduct product) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_branchId == null) {
      setState(() => _error = 'Choose a branch to apply at.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final application = await ref.read(loansRepositoryProvider).applyForLoan(
            productId: product.id,
            branchId: _branchId!,
            requestedAmount: double.parse(_amountController.text.trim()),
            requestedTenureDays: _tenureDays ?? product.minTenureDays,
            purpose: _purposeController.text.trim(),
          );
      ref.invalidate(myApplicationsProvider);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => ApplicationDetailScreen(application: application, justSubmitted: true)),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(activeProductsProvider);
    final branchesAsync = ref.watch(activeBranchesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Apply for a gold loan')),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(onRetry: () => ref.invalidate(activeProductsProvider)),
        data: (products) {
          if (products.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No loan products are available to apply for right now.', textAlign: TextAlign.center),
              ),
            );
          }
          _productId ??= products.first.id;
          final product = _selectedProduct(products) ?? products.first;
          _tenureDays ??= product.minTenureDays;

          return branchesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => _ErrorState(onRetry: () => ref.invalidate(activeBranchesProvider)),
            data: (branches) => _buildForm(context, products, product, branches),
          );
        },
      ),
    );
  }

  Widget _buildForm(BuildContext context, List<LoanProduct> products, LoanProduct product, List<Branch> branches) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (products.length > 1) ...[
            Text('Loan product', style: AppTheme.display(size: 15)),
            const SizedBox(height: 8),
            RadioGroup<String>(
              groupValue: _productId,
              onChanged: (value) => setState(() {
                _productId = value;
                _tenureDays = null;
              }),
              child: Column(
                children: products
                    .map((p) => RadioListTile<String>(value: p.id, title: Text(p.name), contentPadding: EdgeInsets.zero))
                    .toList(),
              ),
            ),
            const SizedBox(height: 8),
          ],
          _ProductInfoCard(product: product),
          const SizedBox(height: 24),
          Text('Amount you need', style: AppTheme.display(size: 15)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              prefixText: '₹  ',
              hintText: 'e.g. 50000',
              helperText: '₹${_formatAmount(product.minLoanAmount)} – ₹${_formatAmount(product.maxLoanAmount)}',
            ),
            validator: (value) {
              final amount = double.tryParse((value ?? '').trim());
              if (amount == null) return 'Enter a valid amount.';
              if (amount < product.minLoanAmount || amount > product.maxLoanAmount) {
                return 'Must be between ₹${_formatAmount(product.minLoanAmount)} and ₹${_formatAmount(product.maxLoanAmount)}.';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          Text('Repayment tenure', style: AppTheme.display(size: 15)),
          const SizedBox(height: 4),
          Text(
            '${_tenureDays ?? product.minTenureDays} days',
            style: const TextStyle(color: AppColors.gold600, fontWeight: FontWeight.w600),
          ),
          Slider(
            value: (_tenureDays ?? product.minTenureDays).toDouble().clamp(
                  product.minTenureDays.toDouble(),
                  product.maxTenureDays.toDouble(),
                ),
            min: product.minTenureDays.toDouble(),
            max: product.maxTenureDays.toDouble(),
            divisions: (product.maxTenureDays - product.minTenureDays).clamp(1, 60),
            label: '${_tenureDays ?? product.minTenureDays} days',
            onChanged: (value) => setState(() => _tenureDays = value.round()),
          ),
          const SizedBox(height: 16),
          Text('Branch', style: AppTheme.display(size: 15)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _branchId,
            decoration: const InputDecoration(hintText: 'Choose where to apply'),
            items: branches
                .map((b) => DropdownMenuItem(value: b.id, child: Text('${b.name} (${b.code})', overflow: TextOverflow.ellipsis)))
                .toList(),
            onChanged: (value) => setState(() => _branchId = value),
          ),
          const SizedBox(height: 24),
          Text('Purpose (optional)', style: AppTheme.display(size: 15)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _purposeController,
            maxLines: 2,
            decoration: const InputDecoration(hintText: 'What is this loan for?'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
          ],
          const SizedBox(height: 28),
          ElevatedButton(
            onPressed: _isSubmitting ? null : () => _submit(product),
            child: _isSubmitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Text('Submit application'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Submitting starts your application — a branch will confirm your appointment and appraise your gold before anything is approved.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.inkLight, fontSize: 12),
          ),
        ],
      ),
    );
  }

  String _formatAmount(double value) {
    if (value >= 100000) return '${(value / 100000).toStringAsFixed(value % 100000 == 0 ? 0 : 1)}L';
    return value.toStringAsFixed(0);
  }
}

class _ProductInfoCard extends StatelessWidget {
  const _ProductInfoCard({required this.product});
  final LoanProduct product;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(product.name, style: AppTheme.display(size: 17)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 20,
              runSpacing: 10,
              children: [
                _Stat(label: 'Loan-to-value', value: 'Up to ${product.maxLtvPercent.toStringAsFixed(0)}%'),
                if (product.annualRatePercent != null)
                  _Stat(label: 'Interest', value: '${product.annualRatePercent!.toStringAsFixed(2)}% p.a.'),
                _Stat(label: 'Grace period', value: '${product.gracePeriodDays} days'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.inkLight)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.gold600)),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded, size: 40, color: AppColors.rose500),
            const SizedBox(height: 12),
            const Text('Could not load this page.', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}

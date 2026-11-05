import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/goldnest_logo.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../loans/presentation/providers/loans_providers.dart';
import '../../../loans/presentation/screens/apply_loan_screen.dart';
import '../../../loans/presentation/screens/my_loans_screen.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../../profile/presentation/screens/kyc_screen.dart';
import '../../../profile/presentation/screens/profile_screen.dart';
import '../../../support/presentation/screens/support_tickets_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [const GoldnestLogo(size: 24), const SizedBox(width: 8), const Text('Goldnest')],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Sign out',
            onPressed: () => _confirmLogout(context, ref),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myProfileProvider),
        child: profileAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(onRetry: () => ref.invalidate(myProfileProvider)),
          data: (profile) => ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Welcome back,', style: const TextStyle(color: AppColors.inkLight)),
                      const SizedBox(height: 4),
                      Text(profile.fullName, style: AppTheme.display(size: 22)),
                      const SizedBox(height: 4),
                      Text(profile.customerCode, style: const TextStyle(color: AppColors.gold600, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Text('KYC status  ', style: TextStyle(color: AppColors.inkLight)),
                          StatusBadge(status: profile.kycStatus),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const _LoansSummaryCard(),
              const SizedBox(height: 20),
              _QuickLinks(kycStatus: profile.kycStatus),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You can sign back in anytime with your mobile number.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await ref.read(authControllerProvider.notifier).logout();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
      }
    }
  }
}

class _LoansSummaryCard extends ConsumerWidget {
  const _LoansSummaryCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loansAsync = ref.watch(myLoansProvider);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Your loans', style: AppTheme.display(size: 17)),
                TextButton(
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyLoansScreen())),
                  child: const Text('View all'),
                ),
              ],
            ),
            loansAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LinearProgressIndicator(),
              ),
              error: (error, _) => const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Could not load your loans.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
              ),
              data: (loans) {
                final active = loans.where((l) => l.status == 'ACTIVE' || l.status == 'OVERDUE').toList();
                if (active.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'No active loans right now.',
                      style: TextStyle(color: AppColors.inkLight, fontSize: 13),
                    ),
                  );
                }
                final totalPrincipal = active.fold<double>(0, (sum, l) => sum + l.principalAmount);
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.account_balance_wallet_rounded, size: 18, color: AppColors.gold500),
                      const SizedBox(width: 8),
                      Text(
                        '${active.length} active · ₹${totalPrincipal.toStringAsFixed(0)} principal',
                        style: const TextStyle(color: AppColors.inkLight, fontSize: 13),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApplyLoanScreen())),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Apply for a gold loan'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickLinks extends StatelessWidget {
  const _QuickLinks({required this.kycStatus});
  final String kycStatus;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.person_outline_rounded, color: AppColors.gold600),
            title: const Text('My profile'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.badge_outlined, color: AppColors.gold600),
            title: const Text('KYC documents'),
            subtitle: Text(kycStatus == 'PENDING' ? 'Submit your documents to get started' : 'View submission status'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KycScreen())),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.support_agent_rounded, color: AppColors.gold600),
            title: const Text('Support'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SupportTicketsScreen())),
          ),
        ],
      ),
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
            const Text('Could not load your profile.', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}

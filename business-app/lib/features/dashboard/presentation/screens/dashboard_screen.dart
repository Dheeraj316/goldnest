import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/goldnest_logo.dart';
import '../../../auctions/presentation/providers/auctions_providers.dart';
import '../../../auctions/presentation/screens/auctions_list_screen.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../cash/presentation/screens/cash_register_screen.dart';
import '../../../collections/presentation/providers/collections_providers.dart';
import '../../../collections/presentation/screens/collections_list_screen.dart';
import '../../../customers/presentation/providers/customers_providers.dart';
import '../../../customers/presentation/screens/kyc_queue_screen.dart';
import '../../../loans/presentation/providers/loans_providers.dart';
import '../../../loans/presentation/screens/applications_list_screen.dart';
import '../../../loans/presentation/screens/loans_list_screen.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../../support/presentation/providers/support_providers.dart';
import '../../../support/presentation/screens/tickets_list_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(myProfileProvider);
    // The server enforces each of these; the links are hidden so a role is never
    // offered a screen that can only open on a 403.
    // What this person may do right now (live from the server once known), not just what their sign-in token said.
    final perms = ref.watch(currentPermissionsProvider);
    bool can(String code) => perms.contains(code);
    // Queues are only fetched (and shown) for roles that may read them — asking the server for the rest
    // would just be refused with a 403.
    final canApplications = can('loan_application.view');
    final canLoans = can('loan.view');
    final canKyc = can('customer.view');
    final canCollections = can('collection.view');
    final canAuctionApproval = can('auction.approve');
    final canAuctions = can('auction.view');
    final canCash = can('cash.view');
    final canTicketManage = can('ticket.manage');
    final workQueues = [
      if (canApplications) ref.watch(pendingApplicationsCountProvider),
      if (canLoans) ...[
        ref.watch(loansAwaitingAppraisalCountProvider),
        ref.watch(loansAwaitingApprovalCountProvider),
        ref.watch(loansReadyToDisburseCountProvider),
      ],
      if (canKyc) ref.watch(kycQueueCountProvider),
      if (canCollections) ...[
        ref.watch(myOverdueCasesCountProvider),
        ref.watch(promisesDueTodayCountProvider),
      ],
      if (canAuctionApproval) ref.watch(auctionsAwaitingApprovalCountProvider),
      if (canTicketManage) ref.watch(openTicketsCountProvider),
    ];
    final workLoading = workQueues.any((q) => q.isLoading && !q.hasValue && !q.hasError);
    final workPending = workQueues.any((q) => (q.value ?? 0) > 0);
    final workReadable = workQueues.any((q) => q.hasValue);

    return Scaffold(
      backgroundColor: AppColors.cream100,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myProfileProvider);
          ref.invalidate(pendingApplicationsCountProvider);
          ref.invalidate(loansAwaitingAppraisalCountProvider);
          ref.invalidate(loansAwaitingApprovalCountProvider);
          ref.invalidate(loansReadyToDisburseCountProvider);
          ref.invalidate(activeLoansCountProvider);
          ref.invalidate(kycQueueCountProvider);
          ref.invalidate(myOverdueCasesCountProvider);
          ref.invalidate(promisesDueTodayCountProvider);
          ref.invalidate(collectionsSummaryProvider);
          ref.invalidate(auctionsAwaitingApprovalCountProvider);
          ref.invalidate(openTicketsCountProvider);
        },
        child: profileAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(onRetry: () => ref.invalidate(myProfileProvider)),
          data: (profile) => ListView(
            padding: EdgeInsets.zero,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(24, 56, 24, 24),
                color: AppColors.navy900,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${profile.branchName} · ${profile.branchCode}',
                            style: const TextStyle(color: AppColors.gold300, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.4),
                          ),
                          const SizedBox(height: 6),
                          Text(profile.fullName, style: AppTheme.display(size: 22, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text(profile.roleName, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                        ],
                      ),
                    ),
                    const GoldnestLogo(variant: LogoVariant.light, size: 30),
                    IconButton(
                      icon: const Icon(Icons.logout_rounded, color: Colors.white70, size: 20),
                      tooltip: 'Sign out',
                      onPressed: () => _confirmLogout(context, ref),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Roles that can see none of these queues (a cashier, say) get no heading at
                    // all; roles that can, but have nothing waiting, get a short all-clear line.
                    if (workLoading || workPending) ...[
                      Text('Needs your attention', style: AppTheme.display(size: 16)),
                      const SizedBox(height: 12),
                    ] else if (workReadable) ...[
                      Text('Needs your attention', style: AppTheme.display(size: 16)),
                      const SizedBox(height: 8),
                      const Text('All clear — nothing is waiting on you right now.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)),
                      const SizedBox(height: 12),
                    ],
                    if (canApplications) ...[
                      _WorkCard(
                        color: AppColors.gold500,
                        countProvider: pendingApplicationsCountProvider,
                        title: 'Applications to start appraisal',
                        subtitle: 'Submitted, waiting on a branch visit',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApplicationsListScreen(initialStatus: 'SUBMITTED'))),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (canLoans) ...[
                      _WorkCard(
                        color: AppColors.navy900,
                        countProvider: loansAwaitingAppraisalCountProvider,
                        title: 'Loans awaiting gold appraisal',
                        subtitle: 'Weigh, value, and submit for checking',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoansListScreen(initialStatus: 'APPRAISAL_PENDING'))),
                      ),
                      const SizedBox(height: 10),
                      _WorkCard(
                        color: AppColors.rose500,
                        countProvider: loansAwaitingApprovalCountProvider,
                        title: 'Appraised — awaiting approval',
                        subtitle: 'A second sign-off is needed',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoansListScreen(initialStatus: 'APPROVAL_PENDING'))),
                      ),
                      const SizedBox(height: 10),
                      _WorkCard(
                        color: AppColors.emerald500,
                        countProvider: loansReadyToDisburseCountProvider,
                        title: 'Approved — ready to disburse',
                        subtitle: 'Funds not yet released',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoansListScreen(initialStatus: 'APPROVED'))),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (canKyc) ...[
                      _WorkCard(
                        color: AppColors.navy700,
                        countProvider: kycQueueCountProvider,
                        title: 'Customer KYC to review',
                        subtitle: 'Documents submitted, waiting on verification',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KycQueueScreen())),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (canCollections) ...[
                      _WorkCard(
                        color: AppColors.rose500,
                        countProvider: myOverdueCasesCountProvider,
                        title: 'Overdue cases assigned to you',
                        subtitle: 'Past maturity and grace — follow up',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CollectionsListScreen())),
                      ),
                      const SizedBox(height: 10),
                      _WorkCard(
                        color: AppColors.gold500,
                        countProvider: promisesDueTodayCountProvider,
                        title: 'Promises to pay due today',
                        subtitle: 'Check whether the customer has paid',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CollectionsListScreen(initialFilter: CaseFilter.open))),
                      ),
                    ],
                    if (canAuctionApproval) ...[
                      _WorkCard(
                        color: AppColors.navy700,
                        countProvider: auctionsAwaitingApprovalCountProvider,
                        title: 'Auctions ready for your approval',
                        subtitle: 'Notice period over — a second person must approve',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuctionsListScreen())),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (canTicketManage) ...[
                      _WorkCard(
                        color: AppColors.gold500,
                        countProvider: openTicketsCountProvider,
                        title: 'Open support tickets',
                        subtitle: 'Not yet picked up by anyone',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TicketsListScreen(initialFilter: TicketFilter.open))),
                      ),
                      const SizedBox(height: 10),
                    ],
                    const SizedBox(height: 24),
                    Text('Quick links', style: AppTheme.display(size: 16)),
                    const SizedBox(height: 12),
                    if (can('loan_application.view'))
                      _LinkRow(
                        icon: Icons.description_outlined,
                        label: 'All applications',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ApplicationsListScreen())),
                      ),
                    if (can('loan.view')) ...[
                      _LinkRow(
                        icon: Icons.account_balance_wallet_outlined,
                        label: 'Active loans',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoansListScreen(initialStatus: 'ACTIVE'))),
                      ),
                      _LinkRow(
                        icon: Icons.list_alt_outlined,
                        label: 'All loans at my branch',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoansListScreen())),
                      ),
                    ],
                    if (can('customer.view'))
                      _LinkRow(
                        icon: Icons.badge_outlined,
                        label: 'Customer KYC queue',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const KycQueueScreen())),
                      ),
                    if (canAuctions)
                      _LinkRow(
                        icon: Icons.gavel_outlined,
                        label: 'Auctions',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AuctionsListScreen())),
                      ),
                    if (canCollections)
                      _LinkRow(
                        icon: Icons.phone_in_talk_outlined,
                        label: 'Collections',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CollectionsListScreen(initialFilter: CaseFilter.open))),
                      ),
                    if (canCash)
                      _LinkRow(
                        icon: Icons.point_of_sale_outlined,
                        label: 'Cash register',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CashRegisterScreen())),
                      ),
                    if (can('ticket.view'))
                      _LinkRow(
                        icon: Icons.support_agent_outlined,
                        label: 'Support tickets',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TicketsListScreen())),
                      ),
                  ],
                ),
              ),
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
        content: const Text('You can sign back in anytime with your mobile number and password.'),
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

class _WorkCard extends ConsumerWidget {
  const _WorkCard({required this.color, required this.countProvider, required this.title, required this.subtitle, required this.onTap});

  final Color color;
  final FutureProvider<int> countProvider;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final countAsync = ref.watch(countProvider);
    final count = countAsync.value ?? 0;
    // Hide the card once there's nothing to do, and also on error — a 403
    // here almost always means this role has no view permission for that
    // queue (e.g. a cashier has no loan_application.view), so the card isn't
    // relevant to them rather than genuinely broken. Still shown while
    // loading, to avoid a flash of disappearing cards on every refresh.
    if (countAsync.hasValue && count == 0) return const SizedBox.shrink();
    if (countAsync.hasError) return const SizedBox.shrink();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.gold100),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: countAsync.isLoading
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 17)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: AppColors.inkLight, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.inkLight),
          ],
        ),
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Icon(icon, color: AppColors.gold600),
        title: Text(label),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
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

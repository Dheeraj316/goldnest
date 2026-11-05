import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../../profile/presentation/providers/profile_providers.dart';
import '../../domain/support_ticket.dart';
import '../providers/support_providers.dart';

class TicketDetailScreen extends ConsumerStatefulWidget {
  const TicketDetailScreen({super.key, required this.ticketId});
  final String ticketId;

  @override
  ConsumerState<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends ConsumerState<TicketDetailScreen> {
  bool _busy = false;
  String? _error;

  void _refresh() {
    ref.invalidate(ticketDetailProvider(widget.ticketId));
    ref.invalidate(openTicketsCountProvider);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      _refresh();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _assignToMe(String myId) => _run(() => ref.read(supportRepositoryProvider).assign(widget.ticketId, myId));

  Future<void> _pickAssignee() async {
    final employees = await ref.read(supportRepositoryProvider).assignableEmployees();
    if (!mounted) return;
    final picked = await showModalBottomSheet<AssignableEmployee>(
      context: context,
      builder: (_) => ListView(
        shrinkWrap: true,
        children: employees
            .map((e) => ListTile(title: Text(e.name ?? 'Unnamed'), onTap: () => Navigator.of(context).pop(e)))
            .toList(),
      ),
    );
    if (picked != null) await _run(() => ref.read(supportRepositoryProvider).assign(widget.ticketId, picked.id));
  }

  Future<void> _waitSheet() async {
    final note = await _promptText(title: 'What are you waiting on?', label: 'Note (optional)', required: false);
    if (note == null) return;
    await _run(() => ref.read(supportRepositoryProvider).markWaiting(widget.ticketId, note: note));
  }

  Future<void> _resolveSheet() async {
    final note = await _promptText(title: 'Resolution note', label: 'What was done', required: true);
    if (note == null) return;
    await _run(() => ref.read(supportRepositoryProvider).resolve(widget.ticketId, resolutionNote: note));
  }

  Future<String?> _promptText({required String title, required String label, required bool required}) async {
    final controller = TextEditingController();
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: AppTheme.display(size: 16)),
            const SizedBox(height: 12),
            TextField(controller: controller, minLines: 3, maxLines: 6, decoration: InputDecoration(labelText: label, border: const OutlineInputBorder())),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  final text = controller.text.trim();
                  if (required && text.length < 5) return;
                  Navigator.of(context).pop(text);
                },
                child: const Text('Submit'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ticketAsync = ref.watch(ticketDetailProvider(widget.ticketId));
    final myId = ref.watch(myProfileProvider).value?.id;
    final perms = ref.watch(currentPermissionsProvider);
    final canManage = perms.contains('ticket.manage');

    return Scaffold(
      appBar: AppBar(title: const Text('Ticket')),
      body: ticketAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: TextButton(onPressed: _refresh, child: const Text('Could not load. Tap to retry.'))),
        data: (t) {
          final isAssignee = myId != null && myId == t.assignedTo;
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView(
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
                            Expanded(child: Text(t.category, style: AppTheme.display(size: 18))),
                            StatusBadge(status: t.status),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(children: [Text(t.ticketNumber, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)), const SizedBox(width: 8), StatusBadge(status: t.priority)]),
                        const Divider(height: 32),
                        _Row(label: 'Customer', value: '${t.customer.name} (${t.customer.customerCode})'),
                        _Row(label: 'Mobile', value: t.customer.mobile),
                        if (t.customer.branchCode != null) _Row(label: 'Branch', value: '${t.customer.branchCode} · ${t.customer.branchName}'),
                        if (t.loanNumber != null) _Row(label: 'About loan', value: t.loanNumber!),
                        _Row(label: 'Raised', value: _formatDate(t.createdAt)),
                        if (t.assigneeName != null) _Row(label: 'Assigned to', value: t.assigneeName!),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('What the customer said', style: AppTheme.display(size: 15)),
                const SizedBox(height: 8),
                Card(child: Padding(padding: const EdgeInsets.all(16), child: Text(t.description))),
                if (t.resolutionNote != null && t.resolutionNote!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text('Resolution', style: AppTheme.display(size: 15)),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.gold50, borderRadius: BorderRadius.circular(14)),
                    child: Text(t.resolutionNote!),
                  ),
                ],
                const SizedBox(height: 20),
                if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
                ..._actions(t, isAssignee, canManage, myId),
              ],
            ),
          );
        },
      ),
    );
  }

  List<Widget> _actions(SupportTicket t, bool isAssignee, bool canManage, String? myId) {
    final buttons = <Widget>[];
    void add(String label, VoidCallback onPressed, {bool primary = false}) {
      buttons.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SizedBox(
            width: double.infinity,
            child: primary
                ? FilledButton(onPressed: _busy ? null : onPressed, child: Text(_busy ? '…' : label))
                : OutlinedButton(onPressed: _busy ? null : onPressed, child: Text(label)),
          ),
        ),
      );
    }

    if (canManage && t.status == 'OPEN') {
      if (myId != null) add('Assign to me', () => _assignToMe(myId), primary: true);
      add('Assign to someone else', _pickAssignee);
    }
    if (canManage && (t.status == 'ASSIGNED' || t.status == 'IN_PROGRESS' || t.status == 'WAITING_FOR_CUSTOMER')) {
      add('Reassign', _pickAssignee);
    }
    if (isAssignee && t.status == 'ASSIGNED') {
      add('Start working on this', () => _run(() => ref.read(supportRepositoryProvider).start(widget.ticketId)), primary: true);
    }
    if (isAssignee && t.status == 'IN_PROGRESS') {
      add('Mark waiting for customer', _waitSheet);
      add('Mark resolved', _resolveSheet, primary: true);
    }
    if (isAssignee && t.status == 'WAITING_FOR_CUSTOMER') {
      add('Resume', () => _run(() => ref.read(supportRepositoryProvider).resume(widget.ticketId)), primary: true);
    }
    if (canManage && t.status == 'RESOLVED') {
      add('Reopen', () => _run(() => ref.read(supportRepositoryProvider).reopen(widget.ticketId)));
      add('Close ticket', () => _run(() => ref.read(supportRepositoryProvider).close(widget.ticketId)), primary: true);
    }
    if (t.status == 'CLOSED') {
      buttons.add(const Text('This ticket is closed — nothing more to do.', style: TextStyle(color: AppColors.inkLight, fontSize: 13)));
    }
    return buttons;
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
          Flexible(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
        ],
      ),
    );
  }
}

String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

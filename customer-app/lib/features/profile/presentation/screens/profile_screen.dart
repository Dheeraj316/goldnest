import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../domain/customer_profile.dart';
import '../providers/profile_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(myProfileProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(myProfileProvider),
        child: profileAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          error: (error, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
                child: Column(
                  children: [
                    const Text('Could not load your profile.', style: TextStyle(color: AppColors.rose500, fontSize: 13)),
                    const SizedBox(height: 8),
                    TextButton(onPressed: () => ref.invalidate(myProfileProvider), child: const Text('Try again')),
                  ],
                ),
              ),
            ],
          ),
          data: (profile) => _ProfileBody(profile: profile),
        ),
      ),
    );
  }
}

class _ProfileBody extends ConsumerStatefulWidget {
  const _ProfileBody({required this.profile});
  final CustomerProfile profile;

  @override
  ConsumerState<_ProfileBody> createState() => _ProfileBodyState();
}

class _ProfileBodyState extends ConsumerState<_ProfileBody> {
  bool _editing = false;
  bool _saving = false;
  String? _error;
  late final _formKey = GlobalKey<FormState>();
  late final TextEditingController _first;
  late final TextEditingController _last;
  late final TextEditingController _email;
  String? _gender;

  @override
  void initState() {
    super.initState();
    _first = TextEditingController(text: widget.profile.firstName);
    _last = TextEditingController(text: widget.profile.lastName ?? '');
    _email = TextEditingController(text: widget.profile.email ?? '');
    _gender = widget.profile.gender;
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      // Email is optional at registration. The backend validates it with @IsOptional() @IsEmail(), which only skips
      // null/undefined — an empty string would be rejected with "email must be an email" — so leave it out when blank.
      final email = _email.text.trim();
      await ref
          .read(profileRepositoryProvider)
          .updateMyProfile(firstName: _first.text.trim(), lastName: _last.text.trim(), email: email.isEmpty ? null : email, gender: _gender);
      ref.invalidate(myProfileProvider);
      if (!mounted) return;
      setState(() => _editing = false);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    return ListView(
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
                    Expanded(child: Text(_editing ? 'Edit your details' : p.fullName, style: AppTheme.display(size: 18))),
                    if (!_editing) TextButton(onPressed: () => setState(() => _editing = true), child: const Text('Edit')),
                  ],
                ),
                const SizedBox(height: 4),
                Text(p.customerCode, style: const TextStyle(color: AppColors.gold600, fontWeight: FontWeight.w600)),
                const Divider(height: 32),
                if (_editing) _EditForm(formKey: _formKey, first: _first, last: _last, email: _email, gender: _gender, onGender: (v) => setState(() => _gender = v))
                else ...[
                  _Row(label: 'Mobile', value: p.mobile),
                  _Row(label: 'Email', value: p.email ?? '—'),
                  _Row(label: 'Gender', value: p.gender?.replaceAll('_', ' ') ?? '—'),
                  _Row(label: 'Address', value: p.addresses.isNotEmpty ? p.addresses.first.formatted : '—'),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [const Text('KYC status', style: TextStyle(color: AppColors.inkLight, fontSize: 13)), StatusBadge(status: p.kycStatus)],
                    ),
                  ),
                ],
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13))),
                if (_editing) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving
                              ? null
                              : () => setState(() {
                                  _editing = false;
                                  _first.text = p.firstName;
                                  _last.text = p.lastName ?? '';
                                  _email.text = p.email ?? '';
                                  _gender = p.gender;
                                  _error = null;
                                }),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Saving…' : 'Save'))),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _EditForm extends StatelessWidget {
  const _EditForm({required this.formKey, required this.first, required this.last, required this.email, required this.gender, required this.onGender});
  final GlobalKey<FormState> formKey;
  final TextEditingController first;
  final TextEditingController last;
  final TextEditingController email;
  final String? gender;
  final ValueChanged<String?> onGender;

  static const _genders = [('MALE', 'Male'), ('FEMALE', 'Female'), ('OTHER', 'Other'), ('PREFER_NOT_TO_SAY', 'Prefer not to say')];

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(controller: first, decoration: const InputDecoration(labelText: 'First name', border: OutlineInputBorder()), validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null),
          const SizedBox(height: 12),
          TextFormField(controller: last, decoration: const InputDecoration(labelText: 'Last name', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextFormField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
            validator: (v) => (v != null && v.isNotEmpty && !v.contains('@')) ? 'Enter a valid email' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: gender,
            decoration: const InputDecoration(labelText: 'Gender', border: OutlineInputBorder()),
            items: _genders.map((g) => DropdownMenuItem(value: g.$1, child: Text(g.$2))).toList(),
            onChanged: onGender,
          ),
        ],
      ),
    );
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
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.inkLight, fontSize: 13)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

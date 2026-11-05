import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../dashboard/presentation/screens/dashboard_screen.dart';
import '../providers/auth_providers.dart';

enum _RegisterStep { mobile, otp, profile }

/// Three steps matching the backend's actual flow exactly (see
/// backend/src/modules/auth/auth.service.ts): a mobile number can't move to
/// step 3 without a *recently verified* OTP — the server checks this too, so
/// this ordering isn't just a UI nicety, skipping it fails server-side.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _pinCodeController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();

  _RegisterStep _step = _RegisterStep.mobile;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [
      _mobileController,
      _otpController,
      _firstNameController,
      _lastNameController,
      _emailController,
      _addressController,
      _pinCodeController,
      _cityController,
      _stateController,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final mobile = _mobileController.text.trim();
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(mobile)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    await _run(() async {
      await ref.read(authRepositoryProvider).requestOtp(mobile: mobile, purpose: 'REGISTRATION');
      setState(() => _step = _RegisterStep.otp);
    });
  }

  Future<void> _verifyOtp() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code sent to your phone.');
      return;
    }
    await _run(() async {
      await ref.read(authRepositoryProvider).verifyRegistrationOtp(mobile: _mobileController.text.trim(), code: code);
      setState(() => _step = _RegisterStep.profile);
    });
  }

  Future<void> _submitProfile() async {
    if (_firstNameController.text.trim().isEmpty ||
        _addressController.text.trim().isEmpty ||
        !RegExp(r'^\d{6}$').hasMatch(_pinCodeController.text.trim()) ||
        _cityController.text.trim().isEmpty ||
        _stateController.text.trim().isEmpty) {
      setState(() => _error = 'Please fill in all required fields.');
      return;
    }
    await _run(() async {
      await ref.read(authControllerProvider.notifier).completeRegistration(
            mobile: _mobileController.text.trim(),
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim().isEmpty ? null : _lastNameController.text.trim(),
            email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
            addressLine1: _addressController.text.trim(),
            pinCode: _pinCodeController.text.trim(),
            city: _cityController.text.trim(),
            addressState: _stateController.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const DashboardScreen()));
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _StepIndicator(step: _step),
              const SizedBox(height: 24),
              switch (_step) {
                _RegisterStep.mobile => _mobileStep(),
                _RegisterStep.otp => _otpStep(),
                _RegisterStep.profile => _profileStep(),
              },
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _onPrimaryAction,
                  child: _isLoading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                      : Text(switch (_step) {
                          _RegisterStep.mobile => 'Send code',
                          _RegisterStep.otp => 'Verify',
                          _RegisterStep.profile => 'Create account',
                        }),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onPrimaryAction() {
    switch (_step) {
      case _RegisterStep.mobile:
        _requestOtp();
      case _RegisterStep.otp:
        _verifyOtp();
      case _RegisterStep.profile:
        _submitProfile();
    }
  }

  Widget _mobileStep() {
    return TextField(
      controller: _mobileController,
      keyboardType: TextInputType.phone,
      maxLength: 10,
      decoration: const InputDecoration(labelText: 'Mobile number', counterText: '', prefixText: '+91  '),
    );
  }

  Widget _otpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Code sent to ${_mobileController.text.trim()}', style: const TextStyle(color: AppColors.inkLight)),
        const SizedBox(height: 16),
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          decoration: const InputDecoration(labelText: '6-digit code', counterText: ''),
        ),
      ],
    );
  }

  Widget _profileStep() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: TextField(controller: _firstNameController, decoration: const InputDecoration(labelText: 'First name'))),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _lastNameController, decoration: const InputDecoration(labelText: 'Last name'))),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email (optional)'),
        ),
        const SizedBox(height: 16),
        TextField(controller: _addressController, decoration: const InputDecoration(labelText: 'Address line 1')),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _pinCodeController,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(labelText: 'PIN code', counterText: ''),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _cityController, decoration: const InputDecoration(labelText: 'City'))),
          ],
        ),
        const SizedBox(height: 16),
        TextField(controller: _stateController, decoration: const InputDecoration(labelText: 'State')),
      ],
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});
  final _RegisterStep step;

  @override
  Widget build(BuildContext context) {
    final labels = ['Mobile', 'Verify', 'Profile'];
    final activeIndex = _RegisterStep.values.indexOf(step);
    return Row(
      children: List.generate(labels.length, (i) {
        final isActive = i <= activeIndex;
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: i == labels.length - 1 ? 0 : 6),
                  decoration: BoxDecoration(
                    color: isActive ? AppColors.gold500 : AppColors.gold100,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

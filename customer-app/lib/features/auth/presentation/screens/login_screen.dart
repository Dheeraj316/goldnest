import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/goldnest_logo.dart';
import '../../../dashboard/presentation/screens/dashboard_screen.dart';
import '../providers/auth_providers.dart';
import 'register_screen.dart';

enum _LoginStep { mobile, otp }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();
  _LoginStep _step = _LoginStep.mobile;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _mobileController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final mobile = _mobileController.text.trim();
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(mobile)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).requestOtp(mobile: mobile, purpose: 'LOGIN');
      if (!mounted) return;
      setState(() => _step = _LoginStep.otp);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyAndLogin() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code sent to your phone.');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).loginWithOtp(mobile: _mobileController.text.trim(), code: code);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const DashboardScreen()));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } on SessionExpiredException {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const GoldnestLogo(size: 40),
              const SizedBox(height: 24),
              Text('Welcome back', style: AppTheme.display(size: 28)),
              const SizedBox(height: 8),
              Text(
                _step == _LoginStep.mobile
                    ? 'Sign in with your mobile number.'
                    : 'Enter the code sent to ${_mobileController.text.trim()}.',
                style: const TextStyle(color: AppColors.inkLight),
              ),
              const SizedBox(height: 32),
              if (_step == _LoginStep.mobile) ..._mobileStep() else ..._otpStep(),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: const TextStyle(color: AppColors.rose500, fontSize: 13)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : (_step == _LoginStep.mobile ? _requestOtp : _verifyAndLogin),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                        )
                      : Text(_step == _LoginStep.mobile ? 'Send code' : 'Verify & sign in'),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: TextButton(
                  onPressed: _isLoading
                      ? null
                      : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text("Don't have an account? Register"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _mobileStep() {
    return [
      TextField(
        controller: _mobileController,
        keyboardType: TextInputType.phone,
        maxLength: 10,
        decoration: const InputDecoration(labelText: 'Mobile number', counterText: '', prefixText: '+91  '),
      ),
    ];
  }

  List<Widget> _otpStep() {
    return [
      TextField(
        controller: _otpController,
        keyboardType: TextInputType.number,
        maxLength: 6,
        decoration: const InputDecoration(labelText: '6-digit code', counterText: ''),
      ),
      TextButton(
        onPressed: _isLoading ? null : () => setState(() => _step = _LoginStep.mobile),
        child: const Text('Change mobile number'),
      ),
    ];
  }
}

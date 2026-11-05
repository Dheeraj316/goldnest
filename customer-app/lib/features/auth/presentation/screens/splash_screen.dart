import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/goldnest_logo.dart';
import '../../../dashboard/presentation/screens/dashboard_screen.dart';
import '../providers/auth_providers.dart';
import 'login_screen.dart';

/// Shows the brand mark briefly while [AuthController] checks secure storage
/// for an existing session, then routes to the dashboard or login — this is
/// the only screen that runs before we know whether anyone is logged in.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _restore());
  }

  Future<void> _restore() async {
    await ref.read(authControllerProvider.notifier).restoreSession();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authControllerProvider, (previous, next) {
      if (next.status == AuthStatus.authenticated) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const DashboardScreen()));
      } else if (next.status == AuthStatus.unauthenticated) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
      }
    });

    return Scaffold(
      backgroundColor: AppColors.navy950,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const GoldnestLogo(variant: LogoVariant.light, size: 44),
            const SizedBox(height: 20),
            Text('Goldnest', style: AppTheme.display(size: 28, color: Colors.white)),
            const SizedBox(height: 32),
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.gold300),
            ),
          ],
        ),
      ),
    );
  }
}

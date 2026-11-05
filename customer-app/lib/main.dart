import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/screens/splash_screen.dart';
import 'core/network/provider_retry.dart';

void main() {
  runApp(ProviderScope(retry: retryTransientOnly, child: const GoldnestCustomerApp()));
}

class GoldnestCustomerApp extends StatelessWidget {
  const GoldnestCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Goldnest',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const SplashScreen(),
    );
  }
}

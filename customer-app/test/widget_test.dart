import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:customer_app/core/widgets/goldnest_logo.dart';
import 'package:customer_app/main.dart';

void main() {
  testWidgets('app boots to the splash screen with the Goldnest brand mark', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: GoldnestCustomerApp()));

    // Don't pumpAndSettle: SplashScreen kicks off a real network call
    // (restoreSession -> /auth calls) via a post-frame callback, which
    // never resolves in a test without a mocked backend. One pump is
    // enough to verify the initial frame renders correctly.
    await tester.pump();

    expect(find.text('Goldnest'), findsOneWidget);
    expect(find.byType(GoldnestLogo), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}

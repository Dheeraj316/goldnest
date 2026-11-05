import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:business_app/main.dart';

void main() {
  testWidgets('App boots to the splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: GoldnestBusinessApp()));
    await tester.pump();

    expect(find.text('Goldnest Staff'), findsOneWidget);
  });
}

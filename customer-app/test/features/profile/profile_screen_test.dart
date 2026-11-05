import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/profile/data/profile_repository.dart';
import 'package:customer_app/features/profile/domain/customer_profile.dart';
import 'package:customer_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:customer_app/features/profile/presentation/screens/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/profile_fixtures.dart';
import '../../support/recording_api.dart';

Future<void> _pump(WidgetTester tester, {required List<Override> overrides}) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: ProfileScreen())),
  );
  await tester.pumpAndSettle();
}

Finder _field(String label) => find.widgetWithText(TextFormField, label);
String _fieldText(WidgetTester tester, String label) => tester.widget<TextFormField>(_field(label)).controller!.text;

void main() {
  group('ProfileScreen - read-only view', () {
    testWidgets('shows the customer details, gender and KYC status badge', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(gender: 'PREFER_NOT_TO_SAY', kycStatus: 'VERIFIED')),
      ]);

      expect(find.text('Asha Verma'), findsOneWidget);
      expect(find.text('GN-000123'), findsOneWidget);
      expect(find.text('9876543210'), findsOneWidget);
      expect(find.text('asha@example.com'), findsOneWidget);
      expect(find.text('PREFER NOT TO SAY'), findsOneWidget); // underscores turned into spaces
      expect(find.text('KYC status'), findsOneWidget);
      expect(find.text('VERIFIED'), findsOneWidget);
      // Not editing yet.
      expect(find.text('Edit'), findsOneWidget);
      expect(find.text('Edit your details'), findsNothing);
      expect(find.byType(TextFormField), findsNothing);
    });

    testWidgets('a registered address renders as one formatted line', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(addresses: const [
              CustomerAddress(line1: '221B Baker Street', line2: null, city: 'Bengaluru', state: 'Karnataka', pinCode: '560001', type: 'RESIDENTIAL'),
            ])),
      ]);

      expect(find.text('221B Baker Street, Bengaluru, Karnataka, 560001'), findsOneWidget);
    });

    testWidgets('a missing email and gender render as a dash', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(email: null, gender: null)),
      ]);

      expect(find.text('—'), findsNWidgets(3));
    });

    testWidgets('a failed load shows the error text and a retry button', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);

      expect(find.text('Could not load your profile.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text('Edit'), findsNothing);
    });
  });

  group('ProfileScreen - edit form', () {
    testWidgets('the Edit button switches to the edit form, pre-filled from the profile', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(firstName: 'Asha', lastName: 'Verma', email: 'asha@example.com')),
      ]);

      await tester.tap(find.widgetWithText(TextButton, 'Edit'));
      await tester.pumpAndSettle();

      expect(find.text('Edit your details'), findsOneWidget);
      expect(find.text('Asha Verma'), findsNothing); // heading is replaced while editing
      expect(find.widgetWithText(TextButton, 'Edit'), findsNothing);
      expect(find.byType(TextFormField), findsNWidgets(3));
      expect(_fieldText(tester, 'First name'), 'Asha');
      expect(_fieldText(tester, 'Last name'), 'Verma');
      expect(_fieldText(tester, 'Email'), 'asha@example.com');
      expect(find.widgetWithText(DropdownButtonFormField<String>, 'Gender'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Cancel'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Save'), findsOneWidget);
      // The read-only rows are hidden while editing.
      expect(find.text('KYC status'), findsNothing);
    });

    testWidgets('Cancel discards typed changes and returns to the read-only view', (tester) async {
      await _pump(tester, overrides: [myProfileProvider.overrideWith((ref) async => sampleProfile())]);

      await tester.tap(find.widgetWithText(TextButton, 'Edit'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('First name'), 'Someone Else');
      await tester.tap(find.widgetWithText(OutlinedButton, 'Cancel'));
      await tester.pumpAndSettle();

      expect(find.text('Asha Verma'), findsOneWidget);
      expect(find.text('Edit your details'), findsNothing);
      expect(find.widgetWithText(TextButton, 'Edit'), findsOneWidget);

      // Re-opening shows the saved value again, not the discarded text.
      await tester.tap(find.widgetWithText(TextButton, 'Edit'));
      await tester.pumpAndSettle();
      expect(_fieldText(tester, 'First name'), 'Asha');
    });
  });

  group('ProfileScreen - saving', () {
    late RecordingAdapter adapter;
    late CustomerProfile current;

    List<Override> repoOverrides({FakeReply? patchReply}) {
      adapter = RecordingAdapter((o) {
        if (o.method == 'PATCH' && o.path == '/customers/me') {
          if (patchReply != null) return patchReply;
          final body = o.data as Map<String, dynamic>;
          current = sampleProfile(
            firstName: (body['firstName'] as String?) ?? current.firstName,
            lastName: (body['lastName'] as String?) ?? current.lastName,
            email: (body['email'] as String?) ?? current.email,
            gender: (body['gender'] as String?) ?? current.gender,
          );
          return FakeReply(profileToJson(current));
        }
        if (o.method == 'GET' && o.path == '/customers/me') return FakeReply(profileToJson(current));
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [profileRepositoryProvider.overrideWithValue(ProfileRepository(apiClient: apiClientWith(adapter)))];
    }

    setUp(() => current = sampleProfile());

    Future<void> openEditor(WidgetTester tester) async {
      await tester.tap(find.widgetWithText(TextButton, 'Edit'));
      await tester.pumpAndSettle();
    }

    Future<void> save(WidgetTester tester) async {
      await tester.tap(find.widgetWithText(FilledButton, 'Save'));
      await tester.pumpAndSettle();
    }

    testWidgets('PATCHes /customers/me with the edited fields, then shows the refreshed profile read-only', (tester) async {
      await _pump(tester, overrides: repoOverrides());

      await openEditor(tester);
      await tester.enterText(_field('First name'), '  Meera ');
      await save(tester);

      final patches = adapter.requests.where((r) => r.method == 'PATCH').toList();
      expect(patches, hasLength(1));
      expect(patches.single.path, '/customers/me');
      expect(patches.single.data, {'firstName': 'Meera', 'lastName': 'Verma', 'email': 'asha@example.com', 'gender': 'FEMALE'});

      // Back in read-only mode, showing the value the server returned on the refetch.
      expect(find.text('Meera Verma'), findsOneWidget);
      expect(find.text('Edit your details'), findsNothing);
      expect(find.widgetWithText(TextButton, 'Edit'), findsOneWidget);
    });

    testWidgets('the gender picked in the dropdown is sent', (tester) async {
      current = sampleProfile(gender: null);
      await _pump(tester, overrides: repoOverrides());

      await openEditor(tester);
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Prefer not to say').last);
      await tester.pumpAndSettle();
      await save(tester);

      final patch = adapter.requests.singleWhere((r) => r.method == 'PATCH');
      expect((patch.data as Map)['gender'], 'PREFER_NOT_TO_SAY');
    });

    testWidgets('an email without an @ is rejected locally and nothing is sent', (tester) async {
      await _pump(tester, overrides: repoOverrides());

      await openEditor(tester);
      await tester.enterText(_field('Email'), 'not-an-email');
      await save(tester);

      expect(find.text('Enter a valid email'), findsOneWidget);
      expect(adapter.requests.where((r) => r.method == 'PATCH'), isEmpty);
      expect(find.text('Edit your details'), findsOneWidget); // still editing
    });

    testWidgets('a blank first name is rejected locally and nothing is sent', (tester) async {
      await _pump(tester, overrides: repoOverrides());

      await openEditor(tester);
      await tester.enterText(_field('First name'), '   ');
      await save(tester);

      expect(find.text('Required'), findsOneWidget);
      expect(adapter.requests.where((r) => r.method == 'PATCH'), isEmpty);
    });

    testWidgets('a customer with no email on file can save without sending an empty email', (tester) async {
      // Email is optional at registration. The backend validates `email` with @IsOptional() @IsEmail(), and
      // IsOptional only skips null/undefined - so an empty string would be rejected with "email must be an email".
      current = sampleProfile(email: null, gender: null);
      await _pump(tester, overrides: repoOverrides());

      await openEditor(tester);
      expect(_fieldText(tester, 'Email'), isEmpty);
      await tester.enterText(_field('First name'), 'Meera');
      await save(tester);

      final patch = adapter.requests.singleWhere((r) => r.method == 'PATCH');
      final body = patch.data as Map<String, dynamic>;
      expect(body['firstName'], 'Meera');
      expect(body.containsKey('email'), isFalse, reason: 'an empty email must be omitted, not sent as ""');
      expect(body.containsKey('gender'), isFalse, reason: 'no gender chosen -> omitted');
    });

    testWidgets('a server error is shown inline, the form stays open, and Save is usable again', (tester) async {
      await _pump(tester, overrides: repoOverrides(patchReply: const FakeReply({'errorCode': 'EMAIL_TAKEN', 'message': 'That email is already in use.'}, status: 409)));

      await openEditor(tester);
      await tester.enterText(_field('Email'), 'taken@example.com');
      await save(tester);

      expect(find.text('That email is already in use.'), findsOneWidget);
      expect(find.text('Edit your details'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Save'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save')).onPressed, isNotNull);
    });
  });
}

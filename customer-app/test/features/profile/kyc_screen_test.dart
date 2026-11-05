import 'package:customer_app/core/network/api_exception.dart';
import 'package:customer_app/features/profile/data/profile_repository.dart';
import 'package:customer_app/features/profile/domain/customer_profile.dart';
import 'package:customer_app/features/profile/presentation/providers/profile_providers.dart';
import 'package:customer_app/features/profile/presentation/screens/kyc_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

import '../../support/profile_fixtures.dart';
import '../../support/recording_api.dart';

const _verifiedPan = KycRecord(id: 'k1', docType: 'PAN', maskedNumber: 'XXXXX1234X', status: 'VERIFIED', rejectionReason: null);
const _rejectedAadhaar = KycRecord(id: 'k2', docType: 'AADHAAR', maskedNumber: 'XXXX XXXX 9012', status: 'REJECTED', rejectionReason: 'Photo is blurry');
const _pendingOther = KycRecord(id: 'k3', docType: 'VOTER_ID', maskedNumber: 'XXXXXX7788', status: 'PENDING', rejectionReason: null);

/// A tall surface so the whole ListView (records + the submit form) is built without scrolling.
Future<void> _pump(WidgetTester tester, {required List<Override> overrides}) async {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(retry: (_, _) => null, overrides: overrides, child: const MaterialApp(home: KycScreen())),
  );
  await tester.pumpAndSettle();
}

/// The Card that holds the record showing [maskedNumber].
Finder _recordCard(String maskedNumber) => find.ancestor(of: find.text(maskedNumber), matching: find.byType(Card));

void main() {
  group('KycScreen - display', () {
    testWidgets('shows the overall status and every submitted record with its masked number and status badge', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(records: [_verifiedPan, _rejectedAadhaar, _pendingOther], kycStatus: 'IN_REVIEW')),
      ]);

      // Overall status badge.
      expect(find.text('Overall status'), findsOneWidget);
      expect(find.text('IN REVIEW'), findsOneWidget);

      // Record 1: PAN card / masked number / VERIFIED.
      expect(_recordCard('XXXXX1234X'), findsOneWidget);
      expect(find.descendant(of: _recordCard('XXXXX1234X'), matching: find.text('PAN card')), findsOneWidget);
      expect(find.descendant(of: _recordCard('XXXXX1234X'), matching: find.text('VERIFIED')), findsOneWidget);

      // Record 2: Aadhaar / masked number / REJECTED.
      expect(find.descendant(of: _recordCard('XXXX XXXX 9012'), matching: find.text('Aadhaar')), findsOneWidget);
      expect(find.descendant(of: _recordCard('XXXX XXXX 9012'), matching: find.text('REJECTED')), findsOneWidget);

      // Record 3: an unrecognised docType falls back to its raw code as the label.
      expect(find.descendant(of: _recordCard('XXXXXX7788'), matching: find.text('VOTER_ID')), findsOneWidget);
      expect(find.descendant(of: _recordCard('XXXXXX7788'), matching: find.text('PENDING')), findsOneWidget);

      // The empty-state card must not appear alongside real records.
      expect(find.text('Nothing submitted yet — add a document below.'), findsNothing);
    });

    testWidgets('the rejection reason is shown for a REJECTED record only', (tester) async {
      const pendingWithStaleReason = KycRecord(id: 'k4', docType: 'PAN', maskedNumber: 'XXXXX0000X', status: 'PENDING', rejectionReason: 'left over from a previous review');
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(records: [_rejectedAadhaar, pendingWithStaleReason])),
      ]);

      expect(find.text('Reason: Photo is blurry'), findsOneWidget);
      expect(find.textContaining('left over from a previous review'), findsNothing);
    });

    testWidgets('a REJECTED record without a reason shows no reason line', (tester) async {
      const noReason = KycRecord(id: 'k5', docType: 'PAN', maskedNumber: 'XXXXX1111X', status: 'REJECTED', rejectionReason: null);
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(records: [noReason])),
      ]);

      expect(find.textContaining('Reason:'), findsNothing);
      expect(find.text('REJECTED'), findsOneWidget);
    });

    testWidgets('no records -> the empty-state text', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => sampleProfile(records: const [], kycStatus: 'PENDING')),
      ]);

      expect(find.text('Nothing submitted yet — add a document below.'), findsOneWidget);
      expect(find.text('PENDING'), findsOneWidget); // overall badge
      expect(find.text('Submit a document'), findsOneWidget);
    });

    testWidgets('a failed load shows the error text and a retry button', (tester) async {
      await _pump(tester, overrides: [
        myProfileProvider.overrideWith((ref) async => throw const ApiException(statusCode: 500, errorCode: 'X', message: 'boom')),
      ]);

      expect(find.text('Could not load your KYC status.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });
  });

  group('KycScreen - submitting a document', () {
    late RecordingAdapter adapter;
    late CustomerProfile current;

    List<Override> repoOverrides() {
      adapter = RecordingAdapter((o) {
        if (o.method == 'GET' && o.path == '/customers/me') {
          return FakeReply(profileToJson(current));
        }
        if (o.method == 'POST' && o.path == '/customers/me/kyc') {
          // The server would add a PENDING record; mirror that so the refetch shows it.
          current = sampleProfile(records: [
            ...current.kycRecords,
            const KycRecord(id: 'new', docType: 'AADHAAR', maskedNumber: 'XXXX XXXX 4321', status: 'PENDING', rejectionReason: null),
          ]);
          return const FakeReply({'id': 'new'}, status: 201);
        }
        return const FakeReply({'errorCode': 'NOT_FOUND', 'message': 'no route'}, status: 404);
      });
      return [profileRepositoryProvider.overrideWithValue(ProfileRepository(apiClient: apiClientWith(adapter)))];
    }

    setUp(() => current = sampleProfile());

    Finder field(String label) => find.widgetWithText(TextFormField, label);

    testWidgets('posts {docType, rawNumber} (trimmed), then refetches and shows the new record', (tester) async {
      await _pump(tester, overrides: repoOverrides());
      expect(find.text('Nothing submitted yet — add a document below.'), findsOneWidget);

      await tester.enterText(field('Document number'), '  ABCDE1234F  ');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      final posts = adapter.requests.where((r) => r.method == 'POST').toList();
      expect(posts, hasLength(1));
      expect(posts.single.path, '/customers/me/kyc');
      expect(posts.single.data, {'docType': 'PAN', 'rawNumber': 'ABCDE1234F'});

      expect(find.text('Submitted for review.'), findsOneWidget);
      // Refetched: the new record is listed and the empty state is gone.
      expect(find.text('XXXX XXXX 4321'), findsOneWidget);
      expect(find.text('Nothing submitted yet — add a document below.'), findsNothing);
      // The number field is cleared so the raw number does not linger on screen.
      expect(tester.widget<TextFormField>(field('Document number')).controller!.text, isEmpty);
    });

    testWidgets('the chosen document type is what gets posted', (tester) async {
      await _pump(tester, overrides: repoOverrides());

      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Aadhaar').last);
      await tester.pumpAndSettle();

      await tester.enterText(field('Document number'), '123412344321');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      final post = adapter.requests.singleWhere((r) => r.method == 'POST');
      expect(post.data, {'docType': 'AADHAAR', 'rawNumber': '123412344321'});
    });

    testWidgets('a too-short number is rejected locally and nothing is sent', (tester) async {
      await _pump(tester, overrides: repoOverrides());
      final before = adapter.requests.length;

      await tester.enterText(field('Document number'), 'AB');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      expect(find.text('Enter the document number'), findsOneWidget);
      expect(adapter.requests.length, before);
      expect(adapter.requests.where((r) => r.method == 'POST'), isEmpty);
    });

    testWidgets('a server error is shown inline and the form stays usable', (tester) async {
      adapter = RecordingAdapter((o) {
        if (o.method == 'POST') return const FakeReply({'errorCode': 'KYC_DUPLICATE', 'message': 'That document is already on file.'}, status: 409);
        return FakeReply(profileToJson(sampleProfile()));
      });
      await _pump(tester, overrides: [profileRepositoryProvider.overrideWithValue(ProfileRepository(apiClient: apiClientWith(adapter)))]);

      await tester.enterText(field('Document number'), 'ABCDE1234F');
      await tester.tap(find.widgetWithText(FilledButton, 'Submit'));
      await tester.pumpAndSettle();

      expect(find.text('That document is already on file.'), findsOneWidget);
      expect(find.text('Submitted for review.'), findsNothing);
      // Button is back to its idle label (not stuck on "Submitting…").
      expect(find.widgetWithText(FilledButton, 'Submit'), findsOneWidget);
    });
  });
}

import 'package:customer_app/features/loans/domain/loan_detail.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _json(String status, {String? ends, String? scheduled}) => {
      'id': 'a1',
      'auctionNumber': 'AUC-2026-000001',
      'status': status,
      'noticePeriodEndsAt': ends,
      'scheduledDate': scheduled,
    };

void main() {
  test('parses the minimal auction fields the API shares with the borrower', () {
    final a = LoanAuction.fromJson(_json('NOTICE_SENT', ends: '2026-10-16T00:00:00.000Z', scheduled: null));
    expect(a.auctionNumber, 'AUC-2026-000001');
    expect(a.noticePeriodEndsAt, DateTime.utc(2026, 10, 16));
    expect(a.scheduledDate, isNull);
  });

  test('a notice is live from when it is sent until the sale or cancellation', () {
    for (final s in ['NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED']) {
      expect(LoanAuction.fromJson(_json(s)).hasLiveNotice, isTrue, reason: s);
    }
    for (final s in ['CANDIDATE', 'UNDER_REVIEW', 'COMPLETED', 'SETTLED', 'CANCELLED']) {
      expect(LoanAuction.fromJson(_json(s)).hasLiveNotice, isFalse, reason: s);
    }
  });
}

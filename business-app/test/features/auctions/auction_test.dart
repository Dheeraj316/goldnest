import 'package:business_app/features/auctions/domain/auction.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _summary(String status, {String? ends}) => {
      'id': 'a1',
      'auctionNumber': 'AUC-2026-000001',
      'status': status,
      'reservePrice': '124082.29',
      'salePrice': null,
      'surplusAmount': null,
      'scheduledDate': null,
      'noticePeriodEndsAt': ends,
      'loan': {'loanNumber': 'GL-HO01-2026-000001', 'principalAmount': '30000.00', 'branch': {'code': 'HO01'}},
      'customer': {'firstName': 'Test', 'lastName': 'Customer'},
    };

void main() {
  test('parses a list item, keeping money as numbers', () {
    final a = AuctionSummary.fromJson(_summary('NOTICE_SENT', ends: '2026-10-16T00:00:00.000Z'));
    expect(a.customerName, 'Test Customer');
    expect(a.principalAmount, 30000);
    expect(a.reservePrice, 124082.29);
    expect(a.branchCode, 'HO01');
    expect(a.salePrice, isNull);
  });

  test('notice period is over from its last day (UTC calendar days)', () {
    final ends = DateTime.utc(2026, 10, 16);
    expect(noticePeriodOver(ends, DateTime.utc(2026, 10, 15, 23, 59)), isFalse);
    expect(noticePeriodOver(ends, DateTime.utc(2026, 10, 16, 0, 0)), isTrue);
    expect(noticePeriodOver(ends, DateTime.utc(2026, 11, 1)), isTrue);
    expect(noticePeriodOver(null), isFalse);
  });

  test('an auction is ready for approval only when notice was sent AND the period is over', () {
    final past = DateTime.now().toUtc().subtract(const Duration(days: 2)).toIso8601String();
    final future = DateTime.now().toUtc().add(const Duration(days: 5)).toIso8601String();
    expect(AuctionSummary.fromJson(_summary('NOTICE_SENT', ends: past)).readyForApproval, isTrue);
    expect(AuctionSummary.fromJson(_summary('NOTICE_SENT', ends: future)).readyForApproval, isFalse);
    expect(AuctionSummary.fromJson(_summary('APPROVED', ends: past)).readyForApproval, isFalse);
    expect(AuctionSummary.fromJson(_summary('UNDER_REVIEW')).readyForApproval, isFalse);
  });

  test('open vs finished statuses', () {
    for (final s in openAuctionStatuses) {
      expect(AuctionSummary.fromJson(_summary(s)).isOpen, isTrue, reason: s);
    }
    for (final s in ['COMPLETED', 'SETTLED', 'CANCELLED']) {
      expect(AuctionSummary.fromJson(_summary(s)).isOpen, isFalse, reason: s);
    }
  });

  test('parses the detail, including shortfall, bids and gold', () {
    final d = AuctionDetail.fromJson({
      'id': 'a1',
      'auctionNumber': 'AUC-2026-000001',
      'status': 'COMPLETED',
      'daysPastDue': 107,
      'loan': {'id': 'l1', 'loanNumber': 'GL-1', 'status': 'AUCTIONED', 'principalAmount': '30000.00', 'branch': {'name': 'Head Office'}},
      'customer': {'firstName': 'Test', 'lastName': null},
      'outstanding': null,
      'noticeSentAt': '2026-09-01T05:00:00.000Z',
      'notices': [
        {'channel': 'SMS'},
        {'channel': 'POST'},
        {'channel': 'SMS'}
      ],
      'bids': [
        {'bidderName': 'A', 'bidAmount': '150000.50', 'isWinning': true},
        {'bidderName': 'B', 'bidAmount': '140000', 'isWinning': false}
      ],
      'shortfall': {'atSale': '11450.00', 'recovered': '4000.00', 'writtenOff': '0.00', 'remaining': '7450.00'},
      'collaterals': [
        {
          'items': [
            {'itemType': 'NECKLACE', 'netWeight': '14.500', 'purityKarat': '22.00'}
          ]
        }
      ],
      'people': {'approvedBy': 'Demo Regional Manager'},
    });
    expect(d.customerName, 'Test');
    expect(d.noticeChannels, ['SMS', 'POST']);
    expect(d.bids.where((b) => b.isWinning).single.amount, 150000.5);
    expect(d.shortfall!.remaining, 7450);
    expect(d.goldItems.single.netWeight, 14.5);
    expect(d.owingTotal, isNull);
    expect(d.noticeLive, isFalse); // sold: the notice is no longer current
    expect(d.people['approvedBy'], 'Demo Regional Manager');
  });
}

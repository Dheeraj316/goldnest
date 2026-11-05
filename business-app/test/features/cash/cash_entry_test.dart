import 'package:business_app/features/cash/domain/cash_entry.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _entry({String id = 'x1', String type = 'RECEIPT', String amount = '1500.00', String? reference = 'GL-HO01-2026-000001', String createdAt = '2026-09-24T04:30:00.000Z'}) =>
    {'id': id, 'type': type, 'amount': amount, 'reference': reference, 'createdAt': createdAt, 'createdBy': 'e1', 'approvedBy': null};

Map<String, dynamic> _day({bool isOpen = true, bool isClosed = false, Object? entries = const <Object>[]}) => {
      'branchId': 'b1',
      'date': '2026-09-24',
      'isOpen': isOpen,
      'isClosed': isClosed,
      'expectedBalance': '11500.00',
      'entries': entries,
    };

void main() {
  group('CashEntry.fromJson', () {
    test('parses every field and keeps money as the server-formatted string', () {
      final e = CashEntry.fromJson(_entry());
      expect(e.id, 'x1');
      expect(e.type, 'RECEIPT');
      expect(e.amount, '1500.00'); // not a double: no float rounding on money shown to staff
      expect(e.reference, 'GL-HO01-2026-000001');
      expect(e.createdAt, DateTime.utc(2026, 9, 24, 4, 30));
      expect(e.createdAt.isUtc, isTrue);
    });

    test('reference null -> null', () {
      expect(CashEntry.fromJson(_entry(reference: null)).reference, isNull);
    });

    test('extra server fields (createdBy, approvedBy) are ignored', () {
      // _entry already carries them; parsing must not choke on fields the model does not declare.
      expect(() => CashEntry.fromJson(_entry()), returnsNormally);
    });
  });

  group('CashDaySummary.fromJson', () {
    test('parses an open register with its entries in order', () {
      final s = CashDaySummary.fromJson(_day(entries: [
        _entry(id: 'o1', type: 'OPENING', amount: '10000.00', reference: null),
        _entry(id: 'r1', type: 'RECEIPT', amount: '1500.00'),
      ]));

      expect(s.branchId, 'b1');
      expect(s.date, '2026-09-24');
      expect(s.isOpen, isTrue);
      expect(s.isClosed, isFalse);
      expect(s.expectedBalance, '11500.00');
      expect(s.entries.map((e) => e.id), ['o1', 'r1']);
      expect(s.entries.first.type, 'OPENING');
      expect(s.entries.first.reference, isNull);
    });

    test('a register that was never opened today', () {
      final s = CashDaySummary.fromJson(_day(isOpen: false, isClosed: false));
      expect(s.isOpen, isFalse);
      expect(s.isClosed, isFalse);
      expect(s.entries, isEmpty);
    });

    test('a closed register', () {
      final s = CashDaySummary.fromJson(_day(isOpen: true, isClosed: true, entries: [_entry(type: 'CLOSING')]));
      expect(s.isClosed, isTrue);
      expect(s.entries.single.type, 'CLOSING');
    });

    test('entries missing entirely -> empty list', () {
      final json = _day()..remove('entries');
      expect(CashDaySummary.fromJson(json).entries, isEmpty);
    });

    test('entries null -> empty list', () {
      expect(CashDaySummary.fromJson(_day(entries: null)).entries, isEmpty);
    });
  });
}

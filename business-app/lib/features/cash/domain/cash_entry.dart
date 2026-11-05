/// Mirrors GET /cash-management/today (see backend/src/modules/cash-management/cash-management.service.ts).
class CashEntry {
  final String id;
  final String type;
  final String amount;
  final String? reference;
  final DateTime createdAt;

  const CashEntry({required this.id, required this.type, required this.amount, required this.reference, required this.createdAt});

  factory CashEntry.fromJson(Map<String, dynamic> json) {
    return CashEntry(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: json['amount'] as String,
      reference: json['reference'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class CashDaySummary {
  final String branchId;
  final String date;
  final bool isOpen;
  final bool isClosed;
  final String expectedBalance;
  final List<CashEntry> entries;

  const CashDaySummary({
    required this.branchId,
    required this.date,
    required this.isOpen,
    required this.isClosed,
    required this.expectedBalance,
    required this.entries,
  });

  factory CashDaySummary.fromJson(Map<String, dynamic> json) {
    return CashDaySummary(
      branchId: json['branchId'] as String,
      date: json['date'] as String,
      isOpen: json['isOpen'] as bool,
      isClosed: json['isClosed'] as bool,
      expectedBalance: json['expectedBalance'] as String,
      entries: ((json['entries'] as List<dynamic>?) ?? const []).map((e) => CashEntry.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

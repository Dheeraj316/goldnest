import '../../../core/utils/parse.dart';

String formatDay(DateTime d) => '${d.day}/${d.month}/${d.year}';

/// Mirrors an item of GET /collections/cases — see
/// backend/src/modules/collections/collections.service.ts#listCases.
class CollectionCaseSummary {
  final String id;
  final String caseNumber;
  final String status;
  final int daysPastDue;
  final String loanNumber;
  final double principalAmount;
  final String customerName;
  final String customerMobile;
  final String? assigneeName;
  final String? closeReason;
  final double? nextPromiseAmount;
  final DateTime? nextPromiseDate;

  const CollectionCaseSummary({
    required this.id,
    required this.caseNumber,
    required this.status,
    required this.daysPastDue,
    required this.loanNumber,
    required this.principalAmount,
    required this.customerName,
    required this.customerMobile,
    this.assigneeName,
    this.closeReason,
    this.nextPromiseAmount,
    this.nextPromiseDate,
  });

  factory CollectionCaseSummary.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>;
    final assignee = json['assignee'] as Map<String, dynamic>?;
    final promise = json['nextPromise'] as Map<String, dynamic>?;
    return CollectionCaseSummary(
      id: json['id'] as String,
      caseNumber: json['caseNumber'] as String,
      status: json['status'] as String,
      daysPastDue: json['daysPastDue'] as int,
      loanNumber: (json['loan'] as Map<String, dynamic>)['loanNumber'] as String,
      principalAmount: parseDecimal((json['loan'] as Map<String, dynamic>)['principalAmount']),
      customerName: [customer['firstName'], customer['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' '),
      customerMobile: customer['mobile'] as String,
      assigneeName: assignee == null ? null : [assignee['firstName'], assignee['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' '),
      closeReason: json['closeReason'] as String?,
      nextPromiseAmount: promise == null ? null : parseDecimal(promise['promisedAmount']),
      nextPromiseDate: promise == null ? null : DateTime.parse(promise['promisedDate'] as String),
    );
  }
}

class CollectionActivityEntry {
  final String type;
  final String? outcome;
  final String? notes;
  final DateTime occurredAt;
  final String? byName;

  const CollectionActivityEntry({required this.type, this.outcome, this.notes, required this.occurredAt, this.byName});

  factory CollectionActivityEntry.fromJson(Map<String, dynamic> json) {
    final employee = json['employee'] as Map<String, dynamic>?;
    return CollectionActivityEntry(
      type: json['type'] as String,
      outcome: json['outcome'] as String?,
      notes: json['notes'] as String?,
      occurredAt: DateTime.parse(json['occurredAt'] as String).toLocal(),
      byName: employee == null ? null : [employee['firstName'], employee['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' '),
    );
  }
}

class PromiseEntry {
  final double amount;
  final DateTime promisedDate;
  final String status;

  const PromiseEntry({required this.amount, required this.promisedDate, required this.status});

  factory PromiseEntry.fromJson(Map<String, dynamic> json) => PromiseEntry(
        amount: parseDecimal(json['promisedAmount']),
        promisedDate: DateTime.parse(json['promisedDate'] as String),
        status: json['status'] as String,
      );
}

class CaseOutstanding {
  final double principal;
  final double interest;
  final double charges;
  final double total;

  const CaseOutstanding({required this.principal, required this.interest, required this.charges, required this.total});

  factory CaseOutstanding.fromJson(Map<String, dynamic> json) => CaseOutstanding(
        principal: parseDecimal(json['principal']),
        interest: parseDecimal(json['interest']),
        charges: parseDecimal(json['charges']),
        total: parseDecimal(json['total']),
      );
}

/// Mirrors GET /collections/cases/:id.
class CollectionCaseDetail {
  final String id;
  final String caseNumber;
  final String status;
  final int daysPastDue;
  final String loanId;
  final String loanNumber;
  final String loanStatus;
  final DateTime? maturityDate;
  final int gracePeriodDays;
  final String customerName;
  final String customerMobile;
  final String? assigneeName;
  final String? closeReason;
  final CaseOutstanding? outstanding;
  final List<CollectionActivityEntry> activities;
  final List<PromiseEntry> promises;

  const CollectionCaseDetail({
    required this.id,
    required this.caseNumber,
    required this.status,
    required this.daysPastDue,
    required this.loanId,
    required this.loanNumber,
    required this.loanStatus,
    this.maturityDate,
    required this.gracePeriodDays,
    required this.customerName,
    required this.customerMobile,
    this.assigneeName,
    this.closeReason,
    this.outstanding,
    required this.activities,
    required this.promises,
  });

  bool get isOpen => status == 'OPEN';

  factory CollectionCaseDetail.fromJson(Map<String, dynamic> json) {
    final loan = json['loan'] as Map<String, dynamic>;
    final customer = json['customer'] as Map<String, dynamic>;
    final assignee = json['assignee'] as Map<String, dynamic>?;
    return CollectionCaseDetail(
      id: json['id'] as String,
      caseNumber: json['caseNumber'] as String,
      status: json['status'] as String,
      daysPastDue: json['daysPastDue'] as int,
      loanId: loan['id'] as String,
      loanNumber: loan['loanNumber'] as String,
      loanStatus: loan['status'] as String,
      maturityDate: loan['maturityDate'] != null ? DateTime.parse(loan['maturityDate'] as String) : null,
      gracePeriodDays: (loan['product'] as Map<String, dynamic>)['gracePeriodDays'] as int,
      customerName: [customer['firstName'], customer['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' '),
      customerMobile: customer['mobile'] as String,
      assigneeName: assignee == null ? null : [assignee['firstName'], assignee['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' '),
      closeReason: json['closeReason'] as String?,
      outstanding: json['outstanding'] == null ? null : CaseOutstanding.fromJson(json['outstanding'] as Map<String, dynamic>),
      activities: (json['activities'] as List<dynamic>).map((e) => CollectionActivityEntry.fromJson(e as Map<String, dynamic>)).toList(),
      promises: (json['promises'] as List<dynamic>).map((e) => PromiseEntry.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class CollectionsSummary {
  final int openCases;
  final int unassigned;
  final int promisesDueToday;
  final int brokenLast7Days;

  const CollectionsSummary({required this.openCases, required this.unassigned, required this.promisesDueToday, required this.brokenLast7Days});

  factory CollectionsSummary.fromJson(Map<String, dynamic> json) => CollectionsSummary(
        openCases: json['openCases'] as int,
        unassigned: json['unassigned'] as int,
        promisesDueToday: json['promisesDueToday'] as int,
        brokenLast7Days: json['brokenLast7Days'] as int,
      );
}

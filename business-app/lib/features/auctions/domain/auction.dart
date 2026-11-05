import '../../../core/utils/parse.dart';

String formatDay(DateTime d) => '${d.day}/${d.month}/${d.year}';

/// Statuses in which an auction is still in progress: nothing has been sold, settled or called off yet.
const openAuctionStatuses = ['CANDIDATE', 'UNDER_REVIEW', 'NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'];

DateTime? _date(dynamic v) => v == null ? null : DateTime.parse(v as String);

String _name(Map<String, dynamic>? c) => c == null ? '' : [c['firstName'], c['lastName']].where((s) => s != null && (s as String).isNotEmpty).join(' ');

/// True once the notice period's last day has been reached (UTC calendar days, like the server).
bool noticePeriodOver(DateTime? endsAt, [DateTime? now]) {
  if (endsAt == null) return false;
  final n = (now ?? DateTime.now()).toUtc();
  final today = DateTime.utc(n.year, n.month, n.day);
  final end = DateTime.utc(endsAt.toUtc().year, endsAt.toUtc().month, endsAt.toUtc().day);
  return !today.isBefore(end);
}

/// An item of GET /auctions — see backend/src/modules/auctions/auctions.service.ts#list.
class AuctionSummary {
  final String id;
  final String auctionNumber;
  final String status;
  final String loanNumber;
  final String customerName;
  final String branchCode;
  final double principalAmount;
  final double? reservePrice;
  final double? salePrice;
  final double? surplusAmount;
  final DateTime? scheduledDate;
  final DateTime? noticePeriodEndsAt;

  const AuctionSummary({
    required this.id,
    required this.auctionNumber,
    required this.status,
    required this.loanNumber,
    required this.customerName,
    required this.branchCode,
    required this.principalAmount,
    this.reservePrice,
    this.salePrice,
    this.surplusAmount,
    this.scheduledDate,
    this.noticePeriodEndsAt,
  });

  factory AuctionSummary.fromJson(Map<String, dynamic> json) {
    final loan = json['loan'] as Map<String, dynamic>;
    return AuctionSummary(
      id: json['id'] as String,
      auctionNumber: json['auctionNumber'] as String,
      status: json['status'] as String,
      loanNumber: loan['loanNumber'] as String,
      customerName: _name(json['customer'] as Map<String, dynamic>?),
      branchCode: ((loan['branch'] as Map<String, dynamic>?)?['code'] as String?) ?? '',
      principalAmount: parseDecimal(loan['principalAmount']),
      reservePrice: parseDecimalOrNull(json['reservePrice']),
      salePrice: parseDecimalOrNull(json['salePrice']),
      surplusAmount: parseDecimalOrNull(json['surplusAmount']),
      scheduledDate: _date(json['scheduledDate']),
      noticePeriodEndsAt: _date(json['noticePeriodEndsAt']),
    );
  }

  bool get isOpen => openAuctionStatuses.contains(status);

  /// The notice period is over and a second person can now approve it.
  bool get readyForApproval => status == 'NOTICE_SENT' && noticePeriodOver(noticePeriodEndsAt);
}

/// An item of GET /auctions/candidates.
class AuctionCandidate {
  final String loanId;
  final String loanNumber;
  final String customerName;
  final String branchCode;
  final double principalAmount;
  final int daysPastDue;

  const AuctionCandidate({
    required this.loanId,
    required this.loanNumber,
    required this.customerName,
    required this.branchCode,
    required this.principalAmount,
    required this.daysPastDue,
  });

  factory AuctionCandidate.fromJson(Map<String, dynamic> json) {
    return AuctionCandidate(
      loanId: json['loanId'] as String,
      loanNumber: json['loanNumber'] as String,
      customerName: _name(json['customer'] as Map<String, dynamic>?),
      branchCode: ((json['branch'] as Map<String, dynamic>?)?['code'] as String?) ?? '',
      principalAmount: parseDecimal(json['principalAmount']),
      daysPastDue: json['daysPastDue'] as int,
    );
  }
}

class AuctionBid {
  final String bidderName;
  final double amount;
  final bool isWinning;
  const AuctionBid({required this.bidderName, required this.amount, required this.isWinning});
  factory AuctionBid.fromJson(Map<String, dynamic> json) => AuctionBid(
        bidderName: json['bidderName'] as String,
        amount: parseDecimal(json['bidAmount']),
        isWinning: json['isWinning'] as bool,
      );
}

class AuctionShortfall {
  final double atSale;
  final double recovered;
  final double writtenOff;
  final double remaining;
  const AuctionShortfall({required this.atSale, required this.recovered, required this.writtenOff, required this.remaining});
  factory AuctionShortfall.fromJson(Map<String, dynamic> json) => AuctionShortfall(
        atSale: parseDecimal(json['atSale']),
        recovered: parseDecimal(json['recovered']),
        writtenOff: parseDecimal(json['writtenOff']),
        remaining: parseDecimal(json['remaining']),
      );
}

class PledgedGoldItem {
  final String itemType;
  final double netWeight;
  final double purityKarat;
  const PledgedGoldItem({required this.itemType, required this.netWeight, required this.purityKarat});
}

/// Mirrors GET /auctions/:id — see backend/src/modules/auctions/auctions.service.ts#detail.
class AuctionDetail {
  final String id;
  final String auctionNumber;
  final String status;
  final String loanId;
  final String loanNumber;
  final String loanStatus;
  final String customerName;
  final String branchName;
  final double principalAmount;
  final int daysPastDue;
  final double? owingTotal;
  final double? goldRatePerGram;
  final double? marketValue;
  final double? reservePricePercent;
  final double? reservePrice;
  final DateTime? noticeSentAt;
  final DateTime? noticePeriodEndsAt;
  final int? noticePeriodDays;
  final DateTime? approvedAt;
  final DateTime? scheduledDate;
  final String? venue;
  final double? salePrice;
  final String? buyerName;
  final double? surplusAmount;
  final String? cancelReason;
  final String? createdBy;
  final String? preparedBy;
  final String? saleRecordedBy;
  final List<String> noticeChannels;
  final List<AuctionBid> bids;
  final AuctionShortfall? shortfall;
  final List<PledgedGoldItem> goldItems;
  final Map<String, String?> people;

  const AuctionDetail({
    required this.id,
    required this.auctionNumber,
    required this.status,
    required this.loanId,
    required this.loanNumber,
    required this.loanStatus,
    required this.customerName,
    required this.branchName,
    required this.principalAmount,
    required this.daysPastDue,
    this.owingTotal,
    this.goldRatePerGram,
    this.marketValue,
    this.reservePricePercent,
    this.reservePrice,
    this.noticeSentAt,
    this.noticePeriodEndsAt,
    this.noticePeriodDays,
    this.approvedAt,
    this.scheduledDate,
    this.venue,
    this.salePrice,
    this.buyerName,
    this.surplusAmount,
    this.cancelReason,
    this.createdBy,
    this.preparedBy,
    this.saleRecordedBy,
    required this.noticeChannels,
    required this.bids,
    this.shortfall,
    required this.goldItems,
    required this.people,
  });

  factory AuctionDetail.fromJson(Map<String, dynamic> json) {
    final loan = json['loan'] as Map<String, dynamic>;
    final outstanding = json['outstanding'] as Map<String, dynamic>?;
    final people = (json['people'] as Map<String, dynamic>? ?? {}).map((k, v) => MapEntry(k, v as String?));
    return AuctionDetail(
      id: json['id'] as String,
      auctionNumber: json['auctionNumber'] as String,
      status: json['status'] as String,
      loanId: loan['id'] as String,
      loanNumber: loan['loanNumber'] as String,
      loanStatus: loan['status'] as String,
      customerName: _name(json['customer'] as Map<String, dynamic>?),
      branchName: ((loan['branch'] as Map<String, dynamic>?)?['name'] as String?) ?? '',
      principalAmount: parseDecimal(loan['principalAmount']),
      daysPastDue: json['daysPastDue'] as int,
      owingTotal: outstanding == null ? null : parseDecimal(outstanding['total']),
      goldRatePerGram: parseDecimalOrNull(json['goldRatePerGram']),
      marketValue: parseDecimalOrNull(json['marketValue']),
      reservePricePercent: parseDecimalOrNull(json['reservePricePercent']),
      reservePrice: parseDecimalOrNull(json['reservePrice']),
      noticeSentAt: _date(json['noticeSentAt']),
      noticePeriodEndsAt: _date(json['noticePeriodEndsAt']),
      noticePeriodDays: json['noticePeriodDays'] as int?,
      approvedAt: _date(json['approvedAt']),
      scheduledDate: _date(json['scheduledDate']),
      venue: json['venue'] as String?,
      salePrice: parseDecimalOrNull(json['salePrice']),
      buyerName: json['buyerName'] as String?,
      surplusAmount: parseDecimalOrNull(json['surplusAmount']),
      cancelReason: json['cancelReason'] as String?,
      createdBy: json['createdBy'] as String?,
      preparedBy: json['preparedBy'] as String?,
      saleRecordedBy: json['saleRecordedBy'] as String?,
      noticeChannels: ((json['notices'] as List<dynamic>?) ?? const []).map((n) => (n as Map<String, dynamic>)['channel'] as String).toSet().toList(),
      bids: ((json['bids'] as List<dynamic>?) ?? const []).map((b) => AuctionBid.fromJson(b as Map<String, dynamic>)).toList(),
      shortfall: json['shortfall'] == null ? null : AuctionShortfall.fromJson(json['shortfall'] as Map<String, dynamic>),
      goldItems: ((json['collaterals'] as List<dynamic>?) ?? const [])
          .expand((c) => ((c as Map<String, dynamic>)['items'] as List<dynamic>))
          .map((i) => PledgedGoldItem(
                itemType: (i as Map<String, dynamic>)['itemType'] as String,
                netWeight: parseDecimal(i['netWeight']),
                purityKarat: parseDecimal(i['purityKarat']),
              ))
          .toList(),
      people: people,
    );
  }

  bool get isOpen => openAuctionStatuses.contains(status);

  /// The borrower's notice can be produced from the moment notice has gone out until the sale or cancellation.
  bool get noticeLive => noticeSentAt != null && const ['NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'].contains(status);
}

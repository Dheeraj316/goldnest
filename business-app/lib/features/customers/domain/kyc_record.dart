class KycRecord {
  final String id;
  final String docType;
  final String maskedNumber;
  final String status;
  final String? rejectionReason;
  final DateTime createdAt;

  const KycRecord({
    required this.id,
    required this.docType,
    required this.maskedNumber,
    required this.status,
    this.rejectionReason,
    required this.createdAt,
  });

  factory KycRecord.fromJson(Map<String, dynamic> json) {
    return KycRecord(
      id: json['id'] as String,
      docType: json['docType'] as String,
      maskedNumber: json['maskedNumber'] as String,
      status: json['status'] as String,
      rejectionReason: json['rejectionReason'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

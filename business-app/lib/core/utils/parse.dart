/// Prisma Decimal fields serialize as JSON strings (see backend's
/// Prisma.Decimal → JSON), never numbers — every money/rate field coming
/// off the wire needs this instead of a plain `as double`.
double parseDecimal(dynamic value) {
  if (value is num) return value.toDouble();
  return double.parse(value as String);
}

double? parseDecimalOrNull(dynamic value) {
  if (value == null) return null;
  return parseDecimal(value);
}

import 'package:business_app/features/customers/domain/customer_detail.dart';
import 'package:business_app/features/customers/domain/customer_list_item.dart';
import 'package:business_app/features/customers/domain/kyc_record.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/customers_fixtures.dart';

void main() {
  group('CustomerDetail.fromJson', () {
    test('parses every field including nested kyc records and addresses', () {
      final customer = CustomerDetail.fromJson(customerJson());

      expect(customer.id, 'c1');
      expect(customer.customerCode, 'GN-000123');
      expect(customer.fullName, 'Asha Verma');
      expect(customer.mobile, '9876543210');
      expect(customer.email, 'asha@example.com');
      expect(customer.kycStatus, 'IN_REVIEW');
      expect(customer.branchId, 'b1');
      expect(customer.kycRecords.single.docType, 'AADHAAR');
      expect(customer.addresses.single.city, 'Bengaluru');
    });

    test('a null last name, email and branch are all handled', () {
      final customer = CustomerDetail.fromJson(customerJson(lastName: null, email: null, branchId: null));
      expect(customer.fullName, 'Asha');
      expect(customer.email, isNull);
      expect(customer.branchId, isNull);
    });

    test('addresses missing entirely -> empty list', () {
      final json = customerJson()..remove('addresses');
      expect(CustomerDetail.fromJson(json).addresses, isEmpty);
    });

    test('addresses null -> empty list', () {
      final json = customerJson()..['addresses'] = null;
      expect(CustomerDetail.fromJson(json).addresses, isEmpty);
    });

    test('no kyc records yet -> empty list, not an error', () {
      expect(CustomerDetail.fromJson(customerJson(kycRecords: const [])).kycRecords, isEmpty);
    });
  });

  group('CustomerAddress', () {
    test('formatted joins every present part with commas', () {
      final customer = CustomerDetail.fromJson(customerJson(addresses: [addressJson()]));
      expect(customer.addresses.single.formatted, '12 MG Road, Near Central Mall, Bengaluru, Karnataka, 560001');
    });

    test('a null line2 is skipped, not rendered as "null"', () {
      final customer = CustomerDetail.fromJson(customerJson(addresses: [addressJson(line2: null)]));
      expect(customer.addresses.single.formatted, '12 MG Road, Bengaluru, Karnataka, 560001');
    });
  });

  group('KycRecord.fromJson', () {
    test('parses the rejection reason when present', () {
      final record = KycRecord.fromJson(kycRecordJson(status: 'REJECTED', rejectionReason: 'Photo is blurry'));
      expect(record.status, 'REJECTED');
      expect(record.rejectionReason, 'Photo is blurry');
    });

    test('a pending record has no rejection reason', () {
      final record = KycRecord.fromJson(kycRecordJson());
      expect(record.rejectionReason, isNull);
    });
  });

  group('CustomerListItem.fromJson', () {
    test('parses the search-row shape and joins the full name', () {
      final item = CustomerListItem.fromJson(customerListItemJson());
      expect(item.fullName, 'Asha Verma');
      expect(item.customerCode, 'GN-000123');
      expect(item.kycStatus, 'IN_REVIEW');
    });

    test('a null last name leaves just the first name', () {
      final item = CustomerListItem.fromJson(customerListItemJson(lastName: null));
      expect(item.fullName, 'Asha');
    });
  });
}

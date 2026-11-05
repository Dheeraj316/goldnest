import 'package:business_app/features/loans/domain/application_detail.dart';
import 'package:business_app/features/loans/domain/staff_loan_application.dart';
import 'package:business_app/features/loans/domain/staff_loan_detail.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/loans_fixtures.dart';

void main() {
  group('StaffLoanDetail.fromJson', () {
    test('parses every field, with money/rate fields off the wire as strings converted to double', () {
      final loan = StaffLoanDetail.fromJson(loanJson());

      expect(loan.id, 'l1');
      expect(loan.loanNumber, 'GL-HO01-2026-000001');
      expect(loan.branchId, 'b1');
      expect(loan.branchName, 'Head Office');
      expect(loan.branchCode, 'HO01');
      expect(loan.principalAmount, 100000.0);
      expect(loan.approvedLtvPercent, 75.0);
      expect(loan.interestRateSnapshot, 18.0);
      expect(loan.tenureDays, 90);
      expect(loan.status, 'ACTIVE');
      expect(loan.disbursedAt, DateTime.utc(2026, 6, 1, 4, 30));
      expect(loan.startDate, DateTime.utc(2026, 6, 1));
      expect(loan.maturityDate, DateTime.utc(2026, 8, 30));
      expect(loan.closedAt, isNull);
      expect(loan.productName, 'Gold Loan Standard');
      expect(loan.customer.fullName, 'Asha Verma');
    });

    test('auctions missing entirely -> empty list (older loans predate the auctions module)', () {
      final json = loanJson()..remove('auctions');
      expect(StaffLoanDetail.fromJson(json).auctions, isEmpty);
    });

    test('auctions explicitly null -> empty list', () {
      final json = loanJson()..['auctions'] = null;
      expect(StaffLoanDetail.fromJson(json).auctions, isEmpty);
    });

    test('parses a populated auction with a scheduled date', () {
      final loan = StaffLoanDetail.fromJson(loanJson(status: 'AUCTIONED', auctions: [auctionJson()]));
      expect(loan.auctions.single.auctionNumber, 'AUC-2026-000001');
      expect(loan.auctions.single.status, 'SCHEDULED');
      expect(loan.auctions.single.scheduledDate, DateTime.utc(2026, 10, 5));
      expect(loan.auctions.single.noticePeriodEndsAt, isNull);
    });

    test('collaterals carry their items and appraisals', () {
      final loan = StaffLoanDetail.fromJson(loanJson(collaterals: [
        collateralJson(appraisals: [appraisalJson(status: 'APPROVED')]),
      ]));
      final collateral = loan.collaterals.single;
      expect(collateral.collateralCode, 'COL-000001');
      expect(collateral.totalNetWeight, 23.0);
      expect(collateral.totalEligibleValue, isNull);
      expect(collateral.items.single.itemType, 'NECKLACE');
      expect(collateral.items.single.netWeight, 23.0);
      expect(collateral.appraisals.single.status, 'APPROVED');
      expect(collateral.appraisals.single.eligibleLoanValue, 103500.0);
      expect(collateral.appraisals.single.items.single.collateralItemId, 'i1');
    });

    test('approvals join approver first + last name, and cope with a null last name', () {
      final loan = StaffLoanDetail.fromJson(loanJson(approvals: [
        approvalJson(approverFirstName: 'Ravi', approverLastName: 'Kumar'),
        approvalJson(approverFirstName: 'Meera', approverLastName: null),
      ]));
      expect(loan.approvals[0].approverName, 'Ravi Kumar');
      expect(loan.approvals[1].approverName, 'Meera');
      expect(loan.approvals[0].approvedAmount, 100000.0);
    });

    test('charges read the nested charge name and the waived flag', () {
      final loan = StaffLoanDetail.fromJson(loanJson(charges: [chargeJson(name: 'Processing fee', waived: true)]));
      expect(loan.charges.single.name, 'Processing fee');
      expect(loan.charges.single.waived, isTrue);
    });

    test('receipts parse every component and the created date', () {
      final loan = StaffLoanDetail.fromJson(loanJson(receipts: [receiptJson()]));
      final r = loan.receipts.single;
      expect(r.receiptNumber, 'RCPT-000001');
      expect(r.totalAmount, 5000.0);
      expect(r.interestComponent, 4500.0);
      expect(r.chargesComponent, 500.0);
      expect(r.createdAt, DateTime.utc(2026, 9, 24, 4, 30));
    });

    test('outstanding breakdown parses all four figures', () {
      final loan = StaffLoanDetail.fromJson(loanJson(outstanding: outstandingJson(principal: 90000, interest: 5000, charges: 500)));
      expect(loan.outstanding.principal, 90000.0);
      expect(loan.outstanding.interest, 5000.0);
      expect(loan.outstanding.charges, 500.0);
      expect(loan.outstanding.total, 95500.0);
    });

    test('a status history reason is optional', () {
      final loan = StaffLoanDetail.fromJson(loanJson(statusHistory: [statusEventJson(toStatus: 'REJECTED', reason: 'KYC incomplete')]));
      expect(loan.statusHistory.single.reason, 'KYC incomplete');
    });
  });

  group('StaffLoanApplication.fromJson', () {
    test('parses the list-row shape', () {
      final app = StaffLoanApplication.fromJson(applicationJson());
      expect(app.applicationNumber, 'APP-2026-000001');
      expect(app.requestedAmount, 100000.0);
      expect(app.requestedTenureDays, 90);
      expect(app.status, 'SUBMITTED');
      expect(app.productName, 'Gold Loan Standard');
      expect(app.customer.customerCode, 'GN-000123');
    });
  });

  group('ApplicationDetail.fromJson', () {
    test('parses branch, product and customer details, with no linked loan', () {
      final detail = ApplicationDetail.fromJson(applicationDetailJson());
      expect(detail.branchName, 'Head Office');
      expect(detail.branchCode, 'HO01');
      expect(detail.productId, 'p1');
      expect(detail.loanId, isNull);
      expect(detail.loanStatus, isNull);
      expect(detail.purpose, isNull);
    });

    test('a linked loan carries its id and status', () {
      final detail = ApplicationDetail.fromJson(applicationDetailJson(status: 'ACTIVE', loan: {'id': 'l1', 'status': 'ACTIVE'}));
      expect(detail.loanId, 'l1');
      expect(detail.loanStatus, 'ACTIVE');
    });

    test('purpose is carried through when present', () {
      final detail = ApplicationDetail.fromJson(applicationDetailJson(purpose: 'Business working capital'));
      expect(detail.purpose, 'Business working capital');
    });
  });
}

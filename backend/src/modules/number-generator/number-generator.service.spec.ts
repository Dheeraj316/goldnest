import { Test } from '@nestjs/testing';
import { NumberGeneratorService } from './number-generator.service';
import { PrismaService } from '../../database/prisma.service';

describe('NumberGeneratorService', () => {
  let service: NumberGeneratorService;
  let queryRawMock: jest.Mock;

  beforeEach(async () => {
    queryRawMock = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [NumberGeneratorService, { provide: PrismaService, useValue: { $queryRaw: queryRawMock } }],
    }).compile();

    service = moduleRef.get(NumberGeneratorService);
  });

  const year = new Date().getFullYear();

  it('formats a customer code as CUS-<year>-000001', async () => {
    queryRawMock.mockResolvedValue([{ last_value: 1 }]);
    const code = await service.generateCustomerCode();
    expect(code).toBe(`CUS-${year}-000001`);
  });

  it('pads sequence numbers to 6 digits regardless of magnitude', async () => {
    queryRawMock.mockResolvedValue([{ last_value: 42 }]);
    const code = await service.generateCustomerCode();
    expect(code).toBe(`CUS-${year}-000042`);
  });

  it('does not pad beyond 6 digits once the sequence exceeds it', async () => {
    queryRawMock.mockResolvedValue([{ last_value: 1234567 }]);
    const code = await service.generateCustomerCode();
    expect(code).toBe(`CUS-${year}-1234567`);
  });

  it('formats a loan number as <PRODUCT>-<BRANCH>-<year>-000001', async () => {
    queryRawMock.mockResolvedValue([{ last_value: 1 }]);
    const code = await service.generateLoanNumber('BLR', 'GL');
    expect(code).toBe(`GL-BLR-${year}-000001`);
  });

  it('formats a packet number as PKT-<BRANCH>-<year>-000001', async () => {
    queryRawMock.mockResolvedValue([{ last_value: 5 }]);
    const code = await service.generatePacketNumber('BLR');
    expect(code).toBe(`PKT-BLR-${year}-000005`);
  });

  it('scopes each entity type independently in the same call sequence', async () => {
    queryRawMock.mockResolvedValueOnce([{ last_value: 1 }]).mockResolvedValueOnce([{ last_value: 1 }]);
    const customerCode = await service.generateCustomerCode();
    const paymentNumber = await service.generatePaymentNumber();
    expect(customerCode).toBe(`CUS-${year}-000001`);
    expect(paymentNumber).toBe(`PAY-${year}-000001`);
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });
});

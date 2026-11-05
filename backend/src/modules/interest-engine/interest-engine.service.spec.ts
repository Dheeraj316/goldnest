import { Prisma } from '@prisma/client';
import { InterestEngineService } from './interest-engine.service';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * Minimal in-memory stand-in for the Prisma calls accrueForDate makes, so
 * the penal-interest cut-off can be pinned without a database.
 */
function makeEngine(opts: { grace: number; maturity: string; annual?: string; penal?: string; principal?: string }) {
  const created: Array<{ interestAmount: Prisma.Decimal; ruleSnapshot: unknown }> = [];
  const prisma = {
    interestAccrual: {
      findUnique: async () => null,
      create: async ({ data }: { data: { interestAmount: Prisma.Decimal; ruleSnapshot: unknown } }) => {
        created.push(data);
        return data;
      },
    },
    loan: {
      findUniqueOrThrow: async ({ select }: { select: Record<string, unknown> }) =>
        select.principalAmount
          ? { principalAmount: new Prisma.Decimal(opts.principal ?? '100000') }
          : {
              productId: 'p1',
              interestRateSnapshot: new Prisma.Decimal(opts.annual ?? '12'),
              startDate: day('2026-01-01'),
              maturityDate: day(opts.maturity),
              product: { gracePeriodDays: opts.grace },
            },
    },
    interestRule: {
      findFirst: async () => ({
        id: 'r1',
        annualRatePercent: new Prisma.Decimal(opts.annual ?? '12'),
        penalRatePercent: new Prisma.Decimal(opts.penal ?? '24'),
        method: 'REDUCING_BALANCE',
      }),
    },
    financialTransaction: { groupBy: async () => [] },
  };
  const engine = new InterestEngineService(prisma as never);
  return { engine, created };
}

describe('InterestEngineService.accrueForDate — penal interest and the grace period', () => {
  it('charges only normal interest on the maturity day itself', async () => {
    const { engine, created } = makeEngine({ grace: 3, maturity: '2026-03-01' });
    await engine.accrueForDate('loan', day('2026-03-01'));
    // 100,000 x 12% / 365 = 32.88
    expect(created[0].interestAmount.toFixed(2)).toBe('32.88');
  });

  it('stays penal-free through the last grace day', async () => {
    const { engine, created } = makeEngine({ grace: 3, maturity: '2026-03-01' });
    await engine.accrueForDate('loan', day('2026-03-04')); // maturity + 3
    expect(created[0].interestAmount.toFixed(2)).toBe('32.88');
  });

  it('adds the penal surcharge from the day after the grace period ends', async () => {
    const { engine, created } = makeEngine({ grace: 3, maturity: '2026-03-01' });
    await engine.accrueForDate('loan', day('2026-03-05')); // maturity + 4
    // normal 32.88 + penal 100,000 x 24% / 365 = 65.75
    expect(created[0].interestAmount.toFixed(2)).toBe('98.63');
  });

  it('with no grace configured, penal starts the day after maturity', async () => {
    const { engine, created } = makeEngine({ grace: 0, maturity: '2026-03-01' });
    await engine.accrueForDate('loan', day('2026-03-02'));
    expect(created[0].interestAmount.toFixed(2)).toBe('98.63');
  });

  it('records the grace period in the rule snapshot for audit', async () => {
    const { engine, created } = makeEngine({ grace: 3, maturity: '2026-03-01' });
    await engine.accrueForDate('loan', day('2026-03-05'));
    expect(created[0].ruleSnapshot).toMatchObject({ gracePeriodDays: 3, penalRatePercent: '24' });
  });
});

import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HealthModule } from '../src/modules/health/health.module';
import { PrismaService } from '../src/database/prisma.service';

// Mirrors the real (global) PrismaModule so HealthModule's constructor
// injection resolves without pulling in a live database connection.
@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } }],
  exports: [PrismaService],
})
class MockPrismaModule {}

// Isolated to HealthModule with a mocked PrismaService so this suite runs
// without a live Postgres instance — full-stack e2e coverage against a real
// database belongs in CI with the docker-compose stack up (see infrastructure/).
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MockPrismaModule, HealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok when the database is reachable', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.database).toBe('up');
      });
  });
});

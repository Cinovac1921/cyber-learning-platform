// The real PrismaService connects to the database, which this test does not need.
jest.mock('./prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule wiring', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-wiring-only';
  });
  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  // Nest builds every controller, guard and service when the module compiles. A guard that needs
  // something its module can't provide fails here, instead of when the server starts.
  it('can build every controller, guard and service', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});

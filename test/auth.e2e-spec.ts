import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { z } from 'zod';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('Log in', async () => {
    const loginDto = {
      email: 'phvcgdx@gmail.com',
      password: 'password',
      associationId: 'de74556e-762d-4882-95ed-1f0ed8cca287',
    };

    const expectedResponseSchema = z.object({
      token: z.string(),
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(201);

    const validation = expectedResponseSchema.safeParse(response.body);

    expect(validation.success).toBeTruthy();
  });
});

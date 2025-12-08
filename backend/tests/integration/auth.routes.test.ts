import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User.model';

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logintest@example.com',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      await User.findOneAndUpdate(
        { email: 'logintest@example.com' },
        { isEmailVerified: true }
      );
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'metest@example.com',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      await User.findOneAndUpdate(
        { email: 'metest@example.com' },
        { isEmailVerified: true }
      );

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'metest@example.com',
          password: 'TestPassword123!',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return error without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logouttest@example.com',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      await User.findOneAndUpdate(
        { email: 'logouttest@example.com' },
        { isEmailVerified: true }
      );

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logouttest@example.com',
          password: 'TestPassword123!',
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

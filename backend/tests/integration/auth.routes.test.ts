import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User.model';
import { authService } from '../../src/services/auth.service';

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
      // Use service directly for first registration to avoid rate limit
      await authService.register({
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
      // Use service directly to avoid rate limit
      const result = await authService.register({
        email: 'logintest@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      await User.findByIdAndUpdate(result.user._id, { isEmailVerified: true });
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
      // Use service directly to avoid rate limit
      const result = await authService.register({
        email: 'metest@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      await User.findByIdAndUpdate(result.user._id, { isEmailVerified: true });

      const loginResult = await authService.login(
        { email: 'metest@example.com', password: 'TestPassword123!' },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      if ('accessToken' in loginResult) {
        accessToken = loginResult.accessToken;
      }
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
      // Use service directly to avoid rate limit
      const result = await authService.register({
        email: 'logouttest@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      await User.findByIdAndUpdate(result.user._id, { isEmailVerified: true });

      const loginResult = await authService.login(
        { email: 'logouttest@example.com', password: 'TestPassword123!' },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      if ('accessToken' in loginResult) {
        accessToken = loginResult.accessToken;
      }
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

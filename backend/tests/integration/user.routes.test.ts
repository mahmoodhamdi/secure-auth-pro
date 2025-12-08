import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User.model';
import { authService } from '../../src/services/auth.service';

describe('User Routes', () => {
  let accessToken: string;

  beforeEach(async () => {
    // Use the auth service directly to avoid rate limiting
    const registerResult = await authService.register({
      email: 'usertest@example.com',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    });

    await User.findByIdAndUpdate(registerResult.user._id, {
      isEmailVerified: true,
    });

    const loginResult = await authService.login(
      {
        email: 'usertest@example.com',
        password: 'TestPassword123!',
      },
      '127.0.0.1',
      'Mozilla/5.0'
    );

    if ('accessToken' in loginResult) {
      accessToken = loginResult.accessToken;
    }
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('usertest@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Jane');
      expect(response.body.data.user.lastName).toBe('Smith');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({
          firstName: 'Jane',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/password', () => {
    it('should change password with correct current password', async () => {
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject with wrong current password', async () => {
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/sessions', () => {
    it('should return user sessions', async () => {
      const response = await request(app)
        .get('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });
  });
});

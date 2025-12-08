# SecureAuth Pro - Project Plan

## Overview

نظام مصادقة متكامل وآمن يدعم JWT، OAuth، و 2FA مع واجهة أمامية Next.js وخلفية Node.js/Express.

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Backend Setup
- [ ] Initialize Node.js project with TypeScript
- [ ] Configure ESLint + Prettier
- [ ] Setup tsconfig.json with strict mode
- [ ] Create folder structure (config, controllers, middleware, models, routes, services, utils, types)
- [ ] Setup environment variables handling with dotenv
- [ ] Configure path aliases (@/config, @/services, etc.)

### 1.2 Frontend Setup
- [ ] Initialize Next.js 14 with App Router
- [ ] Configure TypeScript
- [ ] Setup Tailwind CSS
- [ ] Configure ESLint + Prettier
- [ ] Create folder structure (app, components, hooks, lib, store, types, schemas)
- [ ] Setup path aliases

### 1.3 Docker Setup
- [ ] Create Backend Dockerfile (multi-stage build)
- [ ] Create Frontend Dockerfile (multi-stage build)
- [ ] Create docker-compose.yml for production
- [ ] Create docker-compose.dev.yml for development with hot reload
- [ ] Configure MongoDB container
- [ ] Configure Redis container
- [ ] Setup network and volumes

---

## Phase 2: Database & Cache Layer

### 2.1 MongoDB Configuration
- [ ] Create database connection module (config/database.ts)
- [ ] Implement connection pooling
- [ ] Add connection error handling and retry logic
- [ ] Setup indexes for performance

### 2.2 Redis Configuration
- [ ] Create Redis connection module (config/redis.ts)
- [ ] Implement connection error handling
- [ ] Create Redis utility functions (get, set, del, setex)

### 2.3 Database Models

#### User Model (models/User.model.ts)
```typescript
interface IUser {
  _id: ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorSecret?: string;
  isTwoFactorEnabled: boolean;
  oauthProviders: {
    google?: { id: string; email: string };
    github?: { id: string; email: string };
    facebook?: { id: string; email: string };
  };
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### RefreshToken Model (models/RefreshToken.model.ts)
```typescript
interface IRefreshToken {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  isRevoked: boolean;
  replacedByToken?: string;
  userAgent?: string;
  ipAddress?: string;
}
```

#### Session Model (models/Session.model.ts)
```typescript
interface ISession {
  _id: ObjectId;
  userId: ObjectId;
  refreshTokenId: ObjectId;
  userAgent: string;
  ipAddress: string;
  location?: string;
  device?: string;
  browser?: string;
  os?: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}
```

---

## Phase 3: Core Authentication

### 3.1 JWT Configuration (config/jwt.ts)
- [ ] Define JWT secrets and expiry times
- [ ] Create token generation functions
- [ ] Create token verification functions
- [ ] Implement token blacklisting with Redis

### 3.2 Auth Service (services/auth.service.ts)

#### Register Flow
1. Validate input data with Zod
2. Check if email already exists
3. Hash password with bcrypt (12 rounds)
4. Create user in database
5. Generate email verification token
6. Send verification email
7. Return success response

#### Login Flow
1. Validate input data
2. Find user by email
3. Check if account is active
4. Compare password with bcrypt
5. Check if 2FA is enabled
   - If yes: Return 2FA required response
   - If no: Continue
6. Generate Access Token (15m expiry)
7. Generate Refresh Token (7d expiry)
8. Store Refresh Token in database
9. Create session record
10. Set HTTP-only cookie for refresh token
11. Return access token and user data

#### Logout Flow
1. Get refresh token from cookie
2. Revoke refresh token in database
3. Deactivate session
4. Add access token to Redis blacklist
5. Clear cookies
6. Return success response

#### Refresh Token Flow
1. Get refresh token from cookie
2. Verify token exists in database and not revoked
3. Check token expiration
4. Generate new access token
5. Implement token rotation (optional: generate new refresh token)
6. Update session last activity
7. Return new access token

### 3.3 Password Management

#### Forgot Password Flow
1. Validate email
2. Find user by email
3. Generate password reset token (crypto.randomBytes)
4. Set token expiry (1 hour)
5. Save token to user document
6. Send reset email with link
7. Return success (even if email not found - security)

#### Reset Password Flow
1. Validate token and new password
2. Find user by reset token
3. Check token expiry
4. Hash new password
5. Update password
6. Clear reset token
7. Revoke all refresh tokens (force re-login)
8. Send confirmation email
9. Return success

### 3.4 Email Verification

#### Send Verification Email
1. Generate verification token
2. Set token expiry (24 hours)
3. Save to user document
4. Send email with verification link

#### Verify Email
1. Find user by verification token
2. Check token expiry
3. Set isEmailVerified = true
4. Clear verification token
5. Return success

---

## Phase 4: OAuth Integration

### 4.1 OAuth Configuration (config/oauth.ts)
- [ ] Configure Passport.js strategies
- [ ] Setup Google OAuth 2.0
- [ ] Setup GitHub OAuth
- [ ] Setup Facebook OAuth

### 4.2 OAuth Service (services/oauth.service.ts)

#### Google OAuth Flow
1. User clicks "Login with Google"
2. Redirect to Google consent screen
3. Google redirects back with authorization code
4. Exchange code for tokens
5. Get user profile from Google
6. Check if user exists by Google ID or email
   - If exists: Link account or login
   - If new: Create user account
7. Generate JWT tokens
8. Create session
9. Redirect to frontend with tokens

#### GitHub OAuth Flow
- Same flow as Google with GitHub API

#### Facebook OAuth Flow
- Same flow as Google with Facebook API

### 4.3 OAuth Controllers (controllers/oauth.controller.ts)
- [ ] GET /api/auth/google - Initiate Google OAuth
- [ ] GET /api/auth/google/callback - Handle Google callback
- [ ] GET /api/auth/github - Initiate GitHub OAuth
- [ ] GET /api/auth/github/callback - Handle GitHub callback
- [ ] GET /api/auth/facebook - Initiate Facebook OAuth
- [ ] GET /api/auth/facebook/callback - Handle Facebook callback

---

## Phase 5: Two-Factor Authentication (2FA)

### 5.1 2FA Service (services/twoFactor.service.ts)

#### Enable 2FA Flow
1. Generate TOTP secret (speakeasy)
2. Generate QR code (qrcode)
3. Store secret temporarily in Redis (not in DB yet)
4. Return QR code and backup codes
5. User scans QR with authenticator app

#### Verify & Activate 2FA
1. User enters code from authenticator
2. Verify code against temporary secret
3. If valid: Save secret to user document
4. Generate backup codes (10 codes)
5. Hash and store backup codes
6. Set isTwoFactorEnabled = true
7. Return backup codes (one-time display)

#### 2FA Login Flow
1. After password verification
2. If 2FA enabled: Return 2FA required
3. User enters TOTP code
4. Verify code OR backup code
5. If backup code used: Mark as used
6. If valid: Complete login flow

#### Disable 2FA
1. Verify user password
2. Verify current TOTP code
3. Remove 2FA secret
4. Clear backup codes
5. Set isTwoFactorEnabled = false

---

## Phase 6: Session Management

### 6.1 Session Service (services/session.service.ts)
- [ ] Create session on login
- [ ] Update session activity
- [ ] Parse user agent (ua-parser-js)
- [ ] Get IP geolocation (optional)
- [ ] List active sessions
- [ ] Revoke single session
- [ ] Revoke all sessions

### 6.2 Session Endpoints
- [ ] GET /api/users/sessions - List all active sessions
- [ ] DELETE /api/users/sessions/:id - Revoke specific session
- [ ] DELETE /api/users/sessions - Revoke all sessions (except current)

---

## Phase 7: Security Middleware

### 7.1 Auth Middleware (middleware/auth.middleware.ts)
```typescript
// Verify JWT token
// Check token blacklist in Redis
// Attach user to request
// Handle expired tokens
```

### 7.2 Rate Limiter (middleware/rateLimiter.middleware.ts)
```typescript
// Different limits for different endpoints:
// - Login: 5 attempts per 15 minutes
// - Register: 3 attempts per hour
// - Password reset: 3 attempts per hour
// - API general: 100 requests per 15 minutes
```

### 7.3 Validation Middleware (middleware/validation.middleware.ts)
```typescript
// Generic Zod validation middleware
// Validate body, params, query
// Return formatted error messages
```

### 7.4 Error Handler (middleware/errorHandler.middleware.ts)
```typescript
// Centralized error handling
// Custom error classes
// Error logging
// Production vs Development error responses
```

---

## Phase 8: Email Service

### 8.1 Email Service (services/email.service.ts)
- [ ] Configure Nodemailer with SMTP
- [ ] Create email templates (HTML)
- [ ] Send verification email
- [ ] Send password reset email
- [ ] Send 2FA enabled notification
- [ ] Send login alert (new device)
- [ ] Send password changed notification

### 8.2 Email Templates
- [ ] Welcome email
- [ ] Email verification
- [ ] Password reset
- [ ] 2FA setup confirmation
- [ ] Security alert (new login)
- [ ] Password changed

---

## Phase 9: User Management

### 9.1 User Service (services/user.service.ts)
- [ ] Get user profile
- [ ] Update profile (name, avatar)
- [ ] Change password
- [ ] Delete account

### 9.2 User Controller (controllers/user.controller.ts)
- [ ] GET /api/users/profile
- [ ] PUT /api/users/profile
- [ ] PUT /api/users/password
- [ ] DELETE /api/users/account

---

## Phase 10: Frontend Implementation

### 10.1 Auth Store (store/authStore.ts)
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  tempUserId: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}
```

### 10.2 Axios Configuration (lib/axios.ts)
- [ ] Create axios instance with base URL
- [ ] Add request interceptor for auth token
- [ ] Add response interceptor for token refresh
- [ ] Handle 401 errors (redirect to login)

### 10.3 Auth Pages

#### Login Page (/login)
- [ ] Email/Password form
- [ ] Form validation with Zod
- [ ] OAuth buttons (Google, GitHub, Facebook)
- [ ] Remember me checkbox
- [ ] Forgot password link
- [ ] Error handling
- [ ] Loading states
- [ ] Redirect to dashboard on success

#### Register Page (/register)
- [ ] Name, Email, Password form
- [ ] Password strength indicator
- [ ] Terms acceptance checkbox
- [ ] OAuth registration option
- [ ] Email validation
- [ ] Error handling

#### 2FA Page (/2fa)
- [ ] 6-digit code input
- [ ] Use backup code option
- [ ] Auto-submit on complete
- [ ] Resend code option
- [ ] Timer display

#### Forgot Password Page (/forgot-password)
- [ ] Email input
- [ ] Success message
- [ ] Back to login link

#### Reset Password Page (/reset-password)
- [ ] New password input
- [ ] Confirm password
- [ ] Password requirements display
- [ ] Token validation

### 10.4 Dashboard Pages

#### Dashboard (/dashboard)
- [ ] Welcome message
- [ ] Account overview
- [ ] Quick actions

#### Profile (/profile)
- [ ] View/Edit profile info
- [ ] Change avatar
- [ ] Change password section
- [ ] 2FA setup section
- [ ] Active sessions list
- [ ] Delete account option

### 10.5 Components

#### Auth Components
- [ ] LoginForm
- [ ] RegisterForm
- [ ] OAuthButtons
- [ ] TwoFactorForm
- [ ] ForgotPasswordForm
- [ ] ResetPasswordForm

#### Layout Components
- [ ] Header (with user menu)
- [ ] Footer
- [ ] Sidebar
- [ ] AuthLayout (for auth pages)
- [ ] DashboardLayout (for protected pages)

#### UI Components
- [ ] Button (variants: primary, secondary, danger, outline)
- [ ] Input (with error state)
- [ ] Card
- [ ] Modal
- [ ] Alert
- [ ] Loading spinner
- [ ] Avatar

### 10.6 Hooks
- [ ] useAuth - Authentication state and actions
- [ ] useUser - User data and actions
- [ ] useOAuth - OAuth flow handling
- [ ] useSessions - Session management

---

## Phase 11: Testing

### 11.1 Backend Tests

#### Unit Tests
- [ ] Auth service tests
- [ ] Token service tests
- [ ] User service tests
- [ ] 2FA service tests
- [ ] Validation tests

#### Integration Tests
- [ ] Auth endpoints (register, login, logout, refresh)
- [ ] OAuth endpoints
- [ ] 2FA endpoints
- [ ] User endpoints
- [ ] Session endpoints

### 11.2 Frontend Tests

#### Unit Tests
- [ ] Component tests
- [ ] Hook tests
- [ ] Store tests
- [ ] Utility function tests

#### E2E Tests (Cypress/Playwright)
- [ ] Registration flow
- [ ] Login flow
- [ ] OAuth flow
- [ ] 2FA setup and login
- [ ] Password reset flow
- [ ] Session management

---

## Phase 12: Documentation & Deployment

### 12.1 API Documentation
- [ ] Setup Swagger/OpenAPI
- [ ] Document all endpoints
- [ ] Add request/response examples
- [ ] Add authentication info

### 12.2 Deployment
- [ ] Production environment setup
- [ ] SSL/TLS configuration
- [ ] Environment variables management
- [ ] CI/CD pipeline
- [ ] Monitoring and logging

---

## Implementation Order

### Sprint 1: Foundation
1. Backend setup + TypeScript config
2. Frontend setup + Tailwind
3. Docker configuration
4. Database connection (MongoDB + Redis)
5. Database models

### Sprint 2: Core Auth
1. JWT configuration
2. Register endpoint + tests
3. Login endpoint + tests
4. Logout endpoint + tests
5. Refresh token endpoint + tests
6. Auth middleware

### Sprint 3: Password & Email
1. Email service setup
2. Email templates
3. Forgot password + tests
4. Reset password + tests
5. Email verification + tests

### Sprint 4: OAuth
1. Passport.js setup
2. Google OAuth + tests
3. GitHub OAuth + tests
4. Facebook OAuth + tests

### Sprint 5: 2FA
1. TOTP service setup
2. Enable 2FA + tests
3. 2FA login flow + tests
4. Backup codes + tests
5. Disable 2FA + tests

### Sprint 6: Sessions & Security
1. Session management + tests
2. Rate limiting
3. Security headers
4. Error handling

### Sprint 7: Frontend Auth
1. Axios setup
2. Auth store
3. Login page
4. Register page
5. OAuth buttons

### Sprint 8: Frontend Features
1. 2FA page
2. Password reset pages
3. Dashboard layout
4. Profile page
5. Session management UI

### Sprint 9: Testing & Polish
1. Backend integration tests
2. Frontend unit tests
3. E2E tests
4. Bug fixes
5. Performance optimization

### Sprint 10: Documentation & Deploy
1. API documentation
2. README updates
3. Docker production config
4. Deployment scripts
5. Final testing

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Account not verified |
| AUTH_003 | Account disabled |
| AUTH_004 | Token expired |
| AUTH_005 | Token invalid |
| AUTH_006 | 2FA required |
| AUTH_007 | Invalid 2FA code |
| AUTH_008 | Too many attempts |
| USER_001 | User not found |
| USER_002 | Email already exists |
| USER_003 | Invalid password |
| OAUTH_001 | OAuth provider error |
| OAUTH_002 | Account already linked |
| VAL_001 | Validation error |
| SRV_001 | Internal server error |

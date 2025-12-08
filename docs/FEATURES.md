# SecureAuth Pro - Features Documentation

This document provides comprehensive documentation for all features implemented in SecureAuth Pro.

## Table of Contents

1. [Authentication](#authentication)
2. [OAuth Integration](#oauth-integration)
3. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
4. [Session Management](#session-management)
5. [Password Management](#password-management)
6. [Email Verification](#email-verification)
7. [User Profile](#user-profile)

---

## Authentication

### Registration

**Endpoint:** `POST /api/auth/register`

Registers a new user account with email verification.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Flow:**
1. Validate user input (Zod schema validation)
2. Check if email already exists
3. Hash password with bcrypt (12 rounds)
4. Generate email verification token (expires in 24h)
5. Create user record in MongoDB
6. Send verification email via SMTP
7. Return success message

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

---

### Login

**Endpoint:** `POST /api/auth/login`

Authenticates a user and returns JWT tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Flow:**
1. Validate credentials
2. Check if user exists and account is active
3. Verify password with bcrypt
4. Check if email is verified
5. If 2FA enabled: return tempToken for 2FA verification
6. Generate access token (JWT, 15min expiry)
7. Generate refresh token (stored as HTTP-only cookie, 7 days)
8. Create session record with device info
9. Return user data and access token

**Response (without 2FA):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response (with 2FA enabled):**
```json
{
  "success": true,
  "data": {
    "requires2FA": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Logout

**Endpoint:** `POST /api/auth/logout`

Logs out the user by blacklisting the access token and revoking the refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Flow:**
1. Extract access token from Authorization header
2. Add access token to Redis blacklist (TTL = remaining token expiry)
3. Revoke refresh token in MongoDB
4. Deactivate associated session

---

### Token Refresh

**Endpoint:** `POST /api/auth/refresh`

Refreshes the access token using the refresh token.

**Cookies Required:**
- `refreshToken`: HTTP-only cookie containing the refresh token

**Flow:**
1. Extract refresh token from cookie
2. Verify JWT signature
3. Check if token exists in DB and not revoked
4. Check if token is not expired
5. Generate new access token
6. Update session last activity timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## OAuth Integration

SecureAuth Pro supports three OAuth providers: **Google**, **GitHub**, and **Facebook**.

### Initiate OAuth

**Endpoints:**
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth
- `GET /api/auth/facebook` - Facebook OAuth

Redirects user to the OAuth provider's consent page.

### OAuth Callback

**Endpoints:**
- `GET /api/auth/google/callback`
- `GET /api/auth/github/callback`
- `GET /api/auth/facebook/callback`

**Flow:**
1. Receive authorization code from provider
2. Exchange code for access token
3. Fetch user profile from provider
4. Check if user exists by provider ID
5. If not found, check by email
6. If email exists: link OAuth account to existing user
7. If new user: create account (email pre-verified)
8. Generate session and tokens
9. Redirect to frontend with tokens

**Account Linking:**
- If user logs in with OAuth and email matches existing account, OAuth is automatically linked
- Users can have multiple OAuth providers linked to one account
- Cannot unlink last OAuth provider if no password is set

### OAuth Status

**Endpoint:** `GET /api/users/oauth-status`

Returns which OAuth providers are linked to the user's account.

**Response:**
```json
{
  "google": true,
  "github": false,
  "facebook": false
}
```

---

## Two-Factor Authentication (2FA)

### Enable 2FA - Step 1: Generate Secret

**Endpoint:** `POST /api/auth/2fa/enable`

Generates a TOTP secret and QR code for 2FA setup.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Flow:**
1. Generate 32-character secret using speakeasy
2. Store secret temporarily in Redis (10 min expiry)
3. Generate QR code as data URL
4. Return secret and QR code to user

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP..."
  }
}
```

### Enable 2FA - Step 2: Verify Code

**Endpoint:** `POST /api/auth/2fa/verify`

Verifies the TOTP code and enables 2FA.

**Request Body:**
```json
{
  "code": "123456"
}
```

**Flow:**
1. Retrieve temporary secret from Redis
2. Verify TOTP code (allows 1 step window for clock drift)
3. Generate 10 backup codes
4. Hash and store backup codes in MongoDB
5. Enable 2FA on user account
6. Delete temporary secret from Redis
7. Send notification email
8. Return backup codes (one-time display)

**Response:**
```json
{
  "success": true,
  "data": {
    "backupCodes": [
      "ABCD-1234",
      "EFGH-5678",
      ...
    ]
  }
}
```

### 2FA Login Verification

**Endpoint:** `POST /api/auth/2fa/verify-login`

Completes login when 2FA is required.

**Request Body:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "code": "123456"
}
```

**Flow:**
1. Verify temp token
2. Verify TOTP code against user's secret
3. Create session and generate tokens
4. Return user data and access token

### Use Backup Code

**Endpoint:** `POST /api/auth/2fa/backup`

Uses a backup code when authenticator is unavailable.

**Request Body:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIs...",
  "backupCode": "ABCD-1234"
}
```

**Flow:**
1. Verify temp token
2. Verify backup code against stored hashes
3. Remove used backup code from user's list
4. Create session and generate tokens

### Disable 2FA

**Endpoint:** `POST /api/auth/2fa/disable`

Disables 2FA on the account.

**Request Body:**
```json
{
  "code": "123456"
}
```

**Flow:**
1. Verify current TOTP code
2. Remove 2FA secret and backup codes from user
3. Set `isTwoFactorEnabled` to false

### Regenerate Backup Codes

**Endpoint:** `POST /api/auth/2fa/regenerate-backup`

Generates new backup codes (invalidates old ones).

**Request Body:**
```json
{
  "code": "123456"
}
```

**Flow:**
1. Verify current TOTP code
2. Generate 10 new backup codes
3. Hash and replace old backup codes
4. Return new backup codes

---

## Session Management

### Get Active Sessions

**Endpoint:** `GET /api/users/sessions`

Returns all active sessions for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "...",
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "browser": "Chrome",
        "os": "Windows",
        "device": "Desktop",
        "lastActivity": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-10T08:00:00Z",
        "isActive": true
      }
    ]
  }
}
```

### Revoke Session

**Endpoint:** `DELETE /api/users/sessions/:sessionId`

Revokes a specific session.

**Flow:**
1. Verify session belongs to user
2. Deactivate session
3. Revoke associated refresh token

### Revoke All Sessions

**Endpoint:** `DELETE /api/users/sessions`

Revokes all sessions except the current one.

**Query Parameters:**
- `keepCurrent=true` (optional) - Keep current session active

**Response:**
```json
{
  "success": true,
  "data": {
    "revokedCount": 3
  }
}
```

---

## Password Management

### Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

Sends a password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Flow:**
1. Find user by email
2. Generate password reset token (expires in 1 hour)
3. Hash and store token in user document
4. Send reset email with link
5. Return success (always, to prevent email enumeration)

### Reset Password

**Endpoint:** `POST /api/auth/reset-password`

Resets password using the reset token.

**Request Body:**
```json
{
  "token": "abc123...",
  "password": "NewSecurePass123!"
}
```

**Flow:**
1. Find user by hashed token
2. Verify token not expired
3. Hash and update password
4. Clear reset token fields
5. Revoke all refresh tokens (force re-login)
6. Deactivate all sessions
7. Send password changed confirmation email

### Change Password

**Endpoint:** `PUT /api/users/password`

Changes password for authenticated user.

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Flow:**
1. Verify current password
2. Hash and update new password
3. Send password changed notification email

---

## Email Verification

### Verify Email

**Endpoint:** `POST /api/auth/verify-email`

Verifies user's email address.

**Request Body:**
```json
{
  "token": "abc123..."
}
```

**Flow:**
1. Find user by hashed token
2. Verify token not expired (24h limit)
3. Set `isEmailVerified` to true
4. Clear verification token fields

### Resend Verification Email

**Endpoint:** `POST /api/auth/resend-verification`

Resends the email verification link.

**Flow:**
1. Check if email already verified
2. Generate new verification token
3. Update token in user document
4. Send new verification email

---

## User Profile

### Get Profile

**Endpoint:** `GET /api/users/profile`

Returns the current user's profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://...",
      "isEmailVerified": true,
      "isTwoFactorEnabled": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLogin": "2024-01-15T10:00:00Z"
    }
  }
}
```

### Update Profile

**Endpoint:** `PUT /api/users/profile`

Updates user profile information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "avatar": "https://example.com/avatar.jpg"
}
```

---

## Security Features

### Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **Auth endpoints:** Stricter limits to prevent brute force
- Configurable via environment variables

### Token Blacklisting

- Access tokens are blacklisted in Redis on logout
- Blacklist TTL matches remaining token expiry
- All API requests check blacklist before processing

### Password Security

- Bcrypt hashing with 12 rounds
- Password requirements enforced via Zod schemas
- Passwords never stored in plain text

### Session Security

- Refresh tokens stored as hashed values
- Sessions track device, browser, and IP
- Sessions can be revoked individually or in bulk

### CORS Configuration

- Configurable allowed origins
- Credentials supported for cookie-based auth
- Preflight caching enabled

### HTTP Security Headers

- Helmet.js middleware for security headers
- XSS protection
- Content-Type nosniff
- Frame options set to deny

---

## Frontend Pages

### Authentication Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/auth/login` | User login with email/password |
| Register | `/auth/register` | New user registration |
| Forgot Password | `/auth/forgot-password` | Request password reset |
| Reset Password | `/auth/reset-password` | Set new password |
| Verify Email | `/auth/verify-email` | Email verification |
| 2FA Verification | `/auth/two-factor` | 2FA code entry |
| OAuth Callback | `/auth/oauth-callback` | OAuth redirect handler |

### Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Main dashboard |
| Profile | `/dashboard/profile` | View/edit profile |
| Sessions | `/dashboard/sessions` | Manage active sessions |
| Settings | `/dashboard/settings` | Account settings, 2FA |

---

## API Error Codes

| Code | Description |
|------|-------------|
| `AUTH_001` | Invalid credentials |
| `AUTH_002` | Email not verified |
| `AUTH_003` | Account disabled |
| `AUTH_005` | Invalid or expired token |
| `AUTH_007` | 2FA verification failed |
| `USER_001` | User not found |
| `USER_003` | Current password incorrect |
| `OAUTH_001` | OAuth error |
| `OAUTH_002` | OAuth account already linked |

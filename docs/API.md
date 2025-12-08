# SecureAuth Pro - API Reference

Base URL: `http://localhost:5000/api`

## Authentication

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "string (min 2 chars)",
  "lastName": "string (min 2 chars)",
  "email": "string (valid email)",
  "password": "string (min 8 chars, uppercase, lowercase, number, special char)"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "isEmailVerified": false
    }
  }
}
```

---

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string",
  "rememberMe": "boolean (optional)"
}
```

**Response (no 2FA):** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "isTwoFactorEnabled": false
    },
    "accessToken": "string (JWT)"
  }
}
```

**Response (2FA required):** `200 OK`
```json
{
  "success": true,
  "data": {
    "requires2FA": true,
    "tempToken": "string (JWT)"
  }
}
```

**Cookies Set:**
- `refreshToken`: HTTP-only, secure, 7 days expiry

---

### Logout

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Refresh Token

```http
POST /auth/refresh
Cookie: refreshToken=<refresh_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "string (JWT)"
  }
}
```

---

### Forgot Password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account exists, a reset link has been sent"
}
```

---

### Reset Password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### Verify Email

```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### Resend Verification Email

```http
POST /auth/resend-verification
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

---

## OAuth Endpoints

### Initiate OAuth

```http
GET /auth/google
GET /auth/github
GET /auth/facebook
```

Redirects to OAuth provider's consent page.

---

### OAuth Callback

```http
GET /auth/google/callback?code=<auth_code>
GET /auth/github/callback?code=<auth_code>
GET /auth/facebook/callback?code=<auth_code>
```

Redirects to frontend with token in URL or error.

---

## 2FA Endpoints

### Enable 2FA (Generate Secret)

```http
POST /auth/2fa/enable
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "qrCode": "string (data URL)",
    "manualEntryKey": "string (base32)"
  }
}
```

---

### Verify & Enable 2FA

```http
POST /auth/2fa/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "string (6 digits)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "backupCodes": ["string", "string", ...]
  }
}
```

---

### 2FA Login Verification

```http
POST /auth/2fa/verify-login
Content-Type: application/json

{
  "tempToken": "string",
  "code": "string (6 digits)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "string"
  }
}
```

---

### Use Backup Code

```http
POST /auth/2fa/backup
Content-Type: application/json

{
  "tempToken": "string",
  "backupCode": "string (XXXX-XXXX format)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "string"
  }
}
```

---

### Disable 2FA

```http
POST /auth/2fa/disable
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "string (6 digits)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

---

### Regenerate Backup Codes

```http
POST /auth/2fa/regenerate-backup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "string (6 digits)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "backupCodes": ["string", "string", ...]
  }
}
```

---

### Get Backup Codes Count

```http
GET /auth/2fa/backup-count
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "count": 8
  }
}
```

---

## User Endpoints

### Get Profile

```http
GET /users/profile
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string | null",
      "isEmailVerified": true,
      "isTwoFactorEnabled": false,
      "createdAt": "ISO date string",
      "lastLogin": "ISO date string"
    }
  }
}
```

---

### Update Profile

```http
PUT /users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "avatar": "string URL (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

### Change Password

```http
PUT /users/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Get Active Sessions

```http
GET /users/sessions
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "string",
        "userAgent": "string",
        "ipAddress": "string",
        "browser": "string",
        "os": "string",
        "device": "string",
        "lastActivity": "ISO date string",
        "createdAt": "ISO date string",
        "isActive": true
      }
    ]
  }
}
```

---

### Revoke Session

```http
DELETE /users/sessions/:sessionId
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

### Revoke All Sessions

```http
DELETE /users/sessions
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `keepCurrent=true` (optional) - Keep current session

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "revokedCount": 3
  }
}
```

---

### Get OAuth Status

```http
GET /users/oauth-status
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "google": true,
    "github": false,
    "facebook": false
  }
}
```

---

### Unlink OAuth Provider

```http
DELETE /users/oauth/:provider
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `provider`: `google` | `github` | `facebook`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "OAuth provider unlinked successfully"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "string",
    "code": "string (optional)",
    "statusCode": 400
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Error Codes

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
| `VALIDATION_ERROR` | Request validation failed |

---

## Rate Limiting

Default limits:
- 100 requests per 15 minutes per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642521600
```

When rate limited:
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later",
    "statusCode": 429
  }
}
```

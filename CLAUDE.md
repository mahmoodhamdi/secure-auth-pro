# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureAuth Pro is a comprehensive authentication system with JWT, OAuth (Google, GitHub, Facebook), 2FA, and session management.

## Tech Stack

### Backend
- Node.js 20+, Express.js, TypeScript
- MongoDB 7+ (Mongoose), Redis 7+
- JWT + Passport.js authentication
- Zod validation, Helmet, Rate Limiting

### Frontend
- Next.js 14+ (App Router), TypeScript
- Tailwind CSS, Zustand (state), React Hook Form + Zod
- Axios with interceptors for token refresh

## Development Commands

### Local Development (without Docker)
```bash
# Backend (uses tsx watch for hot reload)
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### Docker Development
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Testing
```bash
# Backend - run all tests
cd backend && npm test

# Backend - run specific test file
cd backend && npx jest tests/unit/auth.service.test.ts

# Backend - run tests matching pattern
cd backend && npx jest --testNamePattern="login"

# Backend - watch mode
cd backend && npm run test:watch

# Backend - coverage report
cd backend && npm run test:coverage

# Frontend - unit tests
cd frontend && npm test

# Frontend - run specific test file
cd frontend && npx jest src/store/__tests__/authStore.test.ts

# Frontend - E2E tests (Playwright - all browsers)
cd frontend && npm run test:e2e

# Frontend - E2E specific test file
cd frontend && npx playwright test e2e/auth.spec.ts

# Frontend - E2E specific browser
cd frontend && npx playwright test --project=chromium
```

### Build & Lint
```bash
# Backend
cd backend && npm run build
cd backend && npm run lint
cd backend && npm run lint:fix
cd backend && npm run format

# Frontend
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm run lint:fix
```

## Architecture

### Backend Structure (`backend/src/`)
- `config/` - Database, JWT, OAuth, Redis configuration
- `controllers/` - Request handlers (auth, user, oauth, session, twoFactor)
- `middleware/` - Auth, validation, rate limiting, error handling
- `models/` - Mongoose models (User, RefreshToken, Session)
- `services/` - Business logic (auth, email, session, twoFactor)
- `routes/` - API route definitions
- `validators/` - Zod validation schemas for requests
- `utils/` - Helpers (encryption, errors, helpers, logger)
- `types/` - TypeScript definitions

### Frontend Structure (`frontend/src/`)
- `app/` - Next.js App Router pages
  - `auth/` - Login, register, password reset, OAuth callback, 2FA pages
  - `dashboard/` - Protected dashboard, profile, sessions, settings pages
- `components/ui/` - Reusable UI components (Button, Card, Input)
- `store/` - Zustand stores (authStore with persist middleware)
- `lib/` - Axios client with interceptors
- `types/` - TypeScript definitions
- `schemas/` - Zod validation schemas

### Backend Testing Structure (`backend/tests/`)
- `setup.ts` - Jest setup with MongoMemoryServer for isolated testing
- `unit/` - Unit tests for services
- `integration/` - Integration tests for API routes using supertest

**Test Setup Notes:**
- Uses MongoMemoryServer for isolated MongoDB instance (no real DB needed)
- Redis is mocked (addToBlacklist, isBlacklisted)
- Email service is mocked (sendVerificationEmail, sendPasswordResetEmail, etc.)
- Jest timeout set to 30000ms for DB operations

### Frontend Testing Structure (`frontend/`)
- `src/**/__tests__/` - Unit tests (Jest + React Testing Library)
- `e2e/` - E2E tests (Playwright)
  - `auth.spec.ts` - Authentication flows
  - `navigation.spec.ts` - Page navigation
  - `accessibility.spec.ts` - A11y checks
  - `form-interactions.spec.ts` - Form behavior

**E2E Setup Notes:**
- Runs against localhost:3000 (auto-starts dev server if not running)
- Tests Chromium, Firefox, WebKit, and Mobile Chrome
- Screenshots on failure, traces on first retry

### Key Architectural Patterns

**Authentication Flow:**
1. Login returns access token (short-lived) + sets refresh token (HTTP-only cookie)
2. If 2FA enabled, returns tempToken requiring verification before full auth
3. Access tokens are JWTs; refresh tokens are hashed and stored in MongoDB
4. Logout blacklists access token in Redis and revokes refresh token

**State Management (Frontend):**
- `authStore` uses Zustand with persist middleware (localStorage)
- Handles login/register/logout and 2FA verification flows
- Stores user, accessToken, isAuthenticated state

**Error Handling:**
- Custom error classes: AppError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError
- Centralized error handler middleware formats all errors consistently

### API Endpoints
- Auth: `/api/auth/*` (register, login, logout, refresh, password reset, verify-email)
- OAuth: `/api/auth/{google,github,facebook}/*`
- 2FA: `/api/auth/2fa/*` (enable, verify, disable)
- Users: `/api/users/*` (profile, sessions)

## Environment Setup

Copy environment files before running:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Key variables: MongoDB URI, Redis connection, JWT secrets, OAuth credentials, SMTP settings.

## Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api-docs

## Error Codes Reference

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
| VAL_001 | Validation error |

## API Response Format

```json
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": { ... } } }
```

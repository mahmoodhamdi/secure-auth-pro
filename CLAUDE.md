# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureAuth Pro is a comprehensive authentication system with JWT, OAuth (Google, GitHub, Facebook), 2FA, and session management.

## Tech Stack

### Backend
- Node.js 20+, Express.js, TypeScript
- MongoDB 7+ (Mongoose), Redis 7+
- JWT + Passport.js authentication
- Zod validation

### Frontend
- Next.js 14+ (App Router), TypeScript
- Tailwind CSS, Zustand (state), React Hook Form + Zod

## Development Commands

### Local Development (without Docker)
```bash
# Backend
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
# Backend
cd backend && npm test
cd backend && npm run test:watch
cd backend && npm run test:coverage

# Frontend
cd frontend && npm test
cd frontend && npm run test:e2e
```

### Build & Lint
```bash
# Backend
cd backend && npm run build
cd backend && npm run lint
cd backend && npm run format

# Frontend
cd frontend && npm run build
cd frontend && npm run lint
```

## Architecture

### Backend Structure (`backend/src/`)
- `config/` - Database, JWT, OAuth, Redis configuration
- `controllers/` - Request handlers (auth, user, oauth)
- `middleware/` - Auth, validation, rate limiting, error handling
- `models/` - Mongoose models (User, RefreshToken, Session)
- `services/` - Business logic (auth, email, oauth, token, twoFactor)
- `routes/` - API route definitions
- `utils/` - Helpers (encryption, validation, logger)
- `types/` - TypeScript definitions

### Frontend Structure (`frontend/src/`)
- `app/` - Next.js App Router pages
  - `(auth)/` - Login, register, password reset pages
  - `(dashboard)/` - Protected dashboard and profile pages
- `components/` - React components (auth/, layout/, ui/)
- `hooks/` - Custom hooks (useAuth, useUser, useOAuth)
- `store/` - Zustand stores (authStore, userStore)
- `lib/` - Utilities (axios client, auth helpers)
- `schemas/` - Zod validation schemas

### API Endpoints
- Auth: `/api/auth/*` (register, login, logout, refresh, password reset)
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

# SecureAuth Pro - Development Instructions & Best Practices

## Table of Contents
1. [Project Structure](#project-structure)
2. [Backend Guidelines](#backend-guidelines)
3. [Frontend Guidelines](#frontend-guidelines)
4. [Security Best Practices](#security-best-practices)
5. [Testing Guidelines](#testing-guidelines)
6. [Git Workflow](#git-workflow)
7. [Code Style](#code-style)

---

## Project Structure

### Backend Structure
```
backend/
├── src/
│   ├── config/          # Configuration files (db, jwt, oauth, redis)
│   ├── controllers/     # Request handlers - thin, delegate to services
│   ├── middleware/      # Express middleware (auth, validation, error)
│   ├── models/          # Mongoose models with TypeScript interfaces
│   ├── routes/          # Route definitions - group by feature
│   ├── services/        # Business logic - fat services, thin controllers
│   ├── utils/           # Helper functions (encryption, logger, etc.)
│   ├── types/           # TypeScript type definitions
│   ├── validators/      # Zod schemas for validation
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server entry point
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
└── package.json
```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── (auth)/      # Auth route group (login, register, etc.)
│   │   ├── (dashboard)/ # Protected route group
│   │   └── api/         # API routes
│   ├── components/
│   │   ├── auth/        # Auth-specific components
│   │   ├── layout/      # Layout components
│   │   └── ui/          # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and configurations
│   ├── store/           # Zustand stores
│   ├── types/           # TypeScript types
│   └── schemas/         # Zod validation schemas
├── tests/
└── package.json
```

---

## Backend Guidelines

### Controller Pattern
Controllers should be thin - only handle HTTP concerns:

```typescript
// Good - Controller delegates to service
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body, req.ip, req.headers['user-agent']);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bad - Business logic in controller
export const login = async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email });
  const isValid = await bcrypt.compare(req.body.password, user.password);
  // ... more logic
};
```

### Service Pattern
Services contain all business logic:

```typescript
// services/auth.service.ts
class AuthService {
  async login(credentials: LoginDto, ipAddress: string, userAgent?: string) {
    const user = await User.findOne({ email: credentials.email });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401, 'AUTH_001');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'AUTH_001');
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email', 403, 'AUTH_002');
    }

    if (user.isTwoFactorEnabled) {
      return {
        requires2FA: true,
        tempToken: await this.generateTempToken(user._id),
      };
    }

    return this.generateAuthTokens(user, ipAddress, userAgent);
  }
}
```

### Error Handling
Use custom error classes:

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage
throw new AppError('User not found', 404, 'USER_001');
throw new AppError('Validation failed', 400, 'VAL_001', { errors: validationErrors });
```

### Validation with Zod
Create schema files for each feature:

```typescript
// validators/auth.validator.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
```

### Mongoose Model Pattern

```typescript
// models/User.model.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    // ... other fields
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ 'oauthProviders.google.id': 1 });

// Pre-save hook for password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method for password comparison
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
```

### JWT Token Management

```typescript
// config/jwt.ts
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User.model';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

export const generateRefreshToken = (user: IUser): string => {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};
```

---

## Frontend Guidelines

### Zustand Store Pattern

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user.types';
import { authApi } from '@/lib/api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  tempToken: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      requires2FA: false,
      tempToken: null,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });

          if (response.requires2FA) {
            set({
              requires2FA: true,
              tempToken: response.tempToken,
              isLoading: false,
            });
            return;
          }

          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            requires2FA: false,
            tempToken: null,
          });
        }
      },

      // ... other actions
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    }
  )
);
```

### Axios Configuration with Interceptors

```typescript
// lib/axios.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Important for cookies
});

// Request interceptor - add auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        useAuthStore.getState().setAccessToken(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Custom Hooks Pattern

```typescript
// hooks/useAuth.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useAuth(options?: { redirectTo?: string; requireAuth?: boolean }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (options?.requireAuth && !isAuthenticated) {
        router.push(options.redirectTo || '/login');
      }
    }
  }, [isAuthenticated, isLoading, options, router]);

  return { isAuthenticated, isLoading, user };
}

// Usage in protected pages
export default function DashboardPage() {
  const { user, isLoading } = useAuth({ requireAuth: true });

  if (isLoading) return <Loading />;

  return <Dashboard user={user} />;
}
```

### Form Handling with React Hook Form + Zod

```typescript
// components/auth/LoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error) {
      setError('root', {
        message: error.response?.data?.error?.message || 'Login failed',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          type="email"
          {...register('email')}
          placeholder="Email"
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input
          type="password"
          {...register('password')}
          placeholder="Password"
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      {errors.root && <div className="error">{errors.root.message}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Component Structure

```typescript
// components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 focus:ring-gray-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4\" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## Security Best Practices

### Password Security
```typescript
// Password hashing - use bcrypt with 12 rounds minimum
const BCRYPT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Password validation rules
const passwordSchema = z.string()
  .min(8, 'Minimum 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[!@#$%^&*]/, 'Must contain special character');
```

### JWT Security
```typescript
// Short-lived access tokens (15 minutes)
const ACCESS_TOKEN_EXPIRY = '15m';

// Longer-lived refresh tokens (7 days)
const REFRESH_TOKEN_EXPIRY = '7d';

// Store refresh tokens in HTTP-only cookies
res.cookie('refreshToken', token, {
  httpOnly: true,      // Prevents XSS access
  secure: true,        // HTTPS only in production
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Implement token rotation - invalidate old refresh token on use
// Store refresh tokens in database to allow revocation
```

### Rate Limiting Configuration
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: { code: 'AUTH_008', message: 'Too many login attempts' } },
});

// Very strict for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
});
```

### Input Validation
```typescript
// Always validate on backend, even if frontend validates
// Never trust client input
// Use Zod for type-safe validation

import { z } from 'zod';

// Sanitize strings
const sanitizedString = z.string().trim().max(255);

// Validate MongoDB ObjectId
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

// Email normalization
const emailSchema = z.string().email().toLowerCase().trim();
```

### Security Headers
```typescript
import helmet from 'helmet';

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
}));
```

### CORS Configuration
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## Testing Guidelines

### Backend Unit Test Example
```typescript
// tests/unit/services/auth.service.test.ts
import { AuthService } from '../../../src/services/auth.service';
import { User } from '../../../src/models/User.model';
import bcrypt from 'bcryptjs';

jest.mock('../../../src/models/User.model');
jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should throw error for invalid email', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'test@test.com', password: 'password' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        password: 'hashedPassword',
        isActive: true,
        isEmailVerified: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'test@test.com', password: 'wrongPassword' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should return tokens for valid credentials', async () => {
      const mockUser = {
        _id: 'userId',
        email: 'test@test.com',
        password: 'hashedPassword',
        isActive: true,
        isEmailVerified: true,
        isTwoFactorEnabled: false,
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });
  });
});
```

### Backend Integration Test Example
```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { User } from '../../src/models/User.model';

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST!);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@test.com');
    });

    it('should reject duplicate email', async () => {
      await User.create({
        email: 'test@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('USER_002');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        });

      // Manually verify email for testing
      await User.updateOne(
        { email: 'test@test.com' },
        { isEmailVerified: true }
      );
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });
});
```

### Frontend Component Test Example
```typescript
// tests/components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    isLoading: false,
  }),
}));

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockLogin = jest.fn();
    jest.spyOn(require('@/store/authStore'), 'useAuthStore').mockReturnValue({
      login: mockLogin,
      isLoading: false,
    });

    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password');
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password');
    });
  });
});
```

---

## Git Workflow

### Branch Naming
```
feature/auth-login
feature/oauth-google
fix/token-refresh-bug
hotfix/security-patch
refactor/user-service
```

### Commit Messages
```
feat(auth): implement JWT login functionality
fix(oauth): handle Google callback error
refactor(user): extract password validation to service
test(auth): add integration tests for register endpoint
docs(readme): update API documentation
chore(deps): upgrade express to 4.18.2
```

### Pull Request Checklist
- [ ] Code follows project style guide
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] No console.log or debug code
- [ ] Environment variables documented
- [ ] API changes documented
- [ ] Security implications considered

---

## Code Style

### TypeScript
- Use strict mode
- Always define return types for functions
- Use interfaces for object shapes
- Use enums for fixed sets of values
- Avoid `any` - use `unknown` if needed

### Naming Conventions
```typescript
// Files: kebab-case
auth.service.ts
user.controller.ts
refresh-token.model.ts

// Classes: PascalCase
class AuthService {}
class UserController {}

// Functions/Variables: camelCase
const getUserById = () => {};
const accessToken = '';

// Constants: SCREAMING_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_EXPIRY = '15m';

// Interfaces: PascalCase with I prefix (optional)
interface IUser {}
interface AuthResponse {}

// Types: PascalCase
type UserRole = 'user' | 'admin';
```

### Import Order
```typescript
// 1. Node.js built-in modules
import path from 'path';
import fs from 'fs';

// 2. External packages
import express from 'express';
import mongoose from 'mongoose';

// 3. Internal modules - absolute imports
import { AuthService } from '@/services/auth.service';
import { User } from '@/models/User.model';

// 4. Internal modules - relative imports
import { validateInput } from './helpers';
```

### Error Messages
- Be specific but don't leak sensitive info
- Use error codes for programmatic handling
- Provide actionable messages for users

```typescript
// Good
throw new AppError('Email already registered', 409, 'USER_002');

// Bad - leaks info
throw new Error('Password for user john@test.com is incorrect');

// Bad - not helpful
throw new Error('Error');
```

---

## Environment Variables

### Required Variables
```env
# Server
NODE_ENV=development|production|test
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/secureauth
MONGODB_URI_TEST=mongodb://localhost:27017/secureauth_test

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=min-32-character-secret-key
JWT_REFRESH_SECRET=different-min-32-character-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Security Notes
- Never commit `.env` files
- Use different secrets for each environment
- Rotate secrets periodically
- Use strong, randomly generated secrets (min 32 characters)

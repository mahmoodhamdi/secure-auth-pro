'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useRedirectIfAuthenticated } from '@/hooks/useAuth';
import { registerSchema, RegisterFormData } from '@/schemas/auth.schema';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';
import { Mail, Lock, User } from 'lucide-react';
import { AxiosError } from 'axios';
import { oauthApi } from '@/lib/axios';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  // Redirect if already authenticated
  useRedirectIfAuthenticated('/dashboard');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      toast.success('Registration successful! Please check your email to verify your account.');
      router.push('/auth/login');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      const message = axiosError.response?.data?.error?.message || 'Registration failed';
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to get started with SecureAuth Pro</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <Input
                type="text"
                placeholder="First name"
                className="pl-10"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <Input
                type="text"
                placeholder="Last name"
                className="pl-10"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input
              type="email"
              placeholder="Email address"
              className="pl-10"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input
              type="password"
              placeholder="Password"
              className="pl-10"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <Input
              type="password"
              placeholder="Confirm password"
              className="pl-10"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          {/* Password requirements */}
          <div className="text-xs text-secondary-500 space-y-1">
            <p>Password must contain:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
              <li>One special character</li>
            </ul>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              className="mt-1 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              required
            />
            <label htmlFor="terms" className="ml-2 text-sm text-secondary-600">
              I agree to the{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        {/* OAuth Buttons */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-secondary-500">Or sign up with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => (window.location.href = oauthApi.getGoogleAuthUrl())}
              title="Sign up with Google"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => (window.location.href = oauthApi.getGitHubAuthUrl())}
              title="Sign up with GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => (window.location.href = oauthApi.getFacebookAuthUrl())}
              title="Sign up with Facebook"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-secondary-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

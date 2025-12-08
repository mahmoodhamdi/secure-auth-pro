import Link from 'next/link';
import { Shield, Lock, Key, Smartphone } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-secondary-900">SecureAuth Pro</span>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="btn btn-primary btn-md"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-6xl">
            Secure Authentication
            <span className="block text-primary-600">Made Simple</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-secondary-600 max-w-2xl mx-auto">
            A comprehensive authentication system with JWT, OAuth integration,
            and two-factor authentication. Built with security best practices.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/auth/register"
              className="btn btn-primary btn-lg"
            >
              Create Account
            </Link>
            <Link
              href="/auth/login"
              className="btn btn-outline btn-lg"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Lock className="h-6 w-6" />}
            title="JWT Authentication"
            description="Secure token-based authentication with automatic refresh"
          />
          <FeatureCard
            icon={<Key className="h-6 w-6" />}
            title="OAuth Integration"
            description="Sign in with Google, GitHub, or Facebook"
          />
          <FeatureCard
            icon={<Smartphone className="h-6 w-6" />}
            title="Two-Factor Auth"
            description="Extra security with TOTP-based 2FA"
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Session Management"
            description="Control and monitor all your active sessions"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-secondary-500 text-sm">
            &copy; {new Date().getFullYear()} SecureAuth Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 text-center hover:shadow-lg transition-shadow">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-secondary-900">{title}</h3>
      <p className="mt-2 text-secondary-600">{description}</p>
    </div>
  );
}

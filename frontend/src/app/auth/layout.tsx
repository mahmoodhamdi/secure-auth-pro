import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Shield className="h-8 w-8 text-primary-600" />
          <span className="text-xl font-bold text-secondary-900">SecureAuth Pro</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-secondary-500">
        &copy; {new Date().getFullYear()} SecureAuth Pro. All rights reserved.
      </footer>
    </div>
  );
}

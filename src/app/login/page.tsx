'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Invalid credentials');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [password, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Terminal-style header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs tracking-widest text-muted-foreground uppercase">OpenClaw Cluster</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
          <p className="text-sm text-muted-foreground mt-1">Operator authentication required</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Operator password"
              autoFocus
              className="w-full px-4 py-3 bg-card border border-border rounded-lg
                         text-foreground placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50
                         transition-colors"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50
                       text-white font-medium rounded-lg transition-colors
                       disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/30 mt-8">
          Secured with HMAC-SHA256
        </p>
      </div>
    </div>
  );
}

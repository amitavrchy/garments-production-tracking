'use client';
import { useState, FormEvent } from 'react';
import { ArrowRight, Layers3, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from './providers';
import { ErrorBanner } from './primitives';
export function Login() {
  const { refresh, error: connectionError } = useSession();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <a className="brand" href="/">
          <span className="brand-mark">
            <Layers3 size={24} />
          </span>
          loom<span className="brand-period">.</span>
        </a>
        <div className="login-copy">
          <span className="eyebrow">MADE FOR THE PRODUCTION FLOOR</span>
          <h1>
            Every stitch.
            <br />
            Every hour.
            <br />
            <em>All connected.</em>
          </h1>
          <p>One clear view of your factory. From the first cut to the final carton.</p>
          <div className="woven-art" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
        </div>
        <footer>Built for the people who make things.</footer>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <span className="eyebrow">YOUR FACTORY, IN FOCUS</span>
          <h2>Welcome back</h2>
          <p>Sign in to your production workspace.</p>
          {(error || connectionError) && <ErrorBanner message={error || connectionError} />}
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                placeholder="you@factory.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="button primary login-submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to workspace'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-note">
            <ShieldCheck size={19} />
            <span>
              Secure access. Role-based permissions.
              <br />
              Your factory’s data stays in your workspace.
            </span>
          </div>
          <p className="login-help">Need access? Contact your factory administrator.</p>
        </div>
        <div className="login-bottom">
          Loom Production Workspace <span>Asia / Dhaka</span>
        </div>
      </section>
    </main>
  );
}

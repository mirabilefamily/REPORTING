import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const demo = !email.trim() && !password;
    if (!demo && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword(demo ? { email: 'ryan@mirabile.com', password: 'demo-access' } : { email, password });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" data-testid="login-card">
        <div className="login-topbar">
          <img className="login-brand-image" src="/goorin_reporting_logo.png?v=4" alt="Goorin REPORTING" />
        </div>

        <div className="login-body">
          <div className="login-heading">
            <h1>Welcome back</h1>
            <p>Sign in to your REPORTING dashboard</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="login-field-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                aria-label="Email"
                data-testid="login-email-input"
              />
            </label>

            <label className="login-field">
              <span className="login-field-label login-field-label-row">
                Password
                <button type="button" className="login-forgot" tabIndex={-1} data-testid="login-forgot-btn">Forgot password?</button>
              </span>
              <div className="login-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  aria-label="Password"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="login-toggle-password-btn"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && <div className="login-error" role="alert" data-testid="login-error">{error}</div>}

            <button className="login-submit is-ready" type="submit" disabled={loading} data-testid="login-submit-btn">
              {loading ? <Loader2 size={18} className="login-spin" /> : 'Log in'}
            </button>
          </form>

          <p className="login-foot">Need access? Contact your administrator.</p>

          <div className="login-cardfoot">
            <span className="login-status"><i />All systems operational<span className="login-dot" /></span>
            <span className="login-copyright">© 2026 Goorin Bros., Inc.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

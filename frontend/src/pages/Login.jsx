import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@orchestrator.dev');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="dotted-grid"
      style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <svg width="30" height="30" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#141b29" />
            <circle cx="8" cy="10" r="3" fill="#37C6C0" />
            <circle cx="8" cy="22" r="3" fill="#37C6C0" />
            <circle cx="24" cy="16" r="3" fill="#F5A623" />
            <path d="M11 10H16C18 10 18 16 21 16" stroke="#5B7BFA" strokeWidth="1.6" fill="none" />
            <path d="M11 22H16C18 22 18 16 21 16" stroke="#5B7BFA" strokeWidth="1.6" fill="none" />
          </svg>
          <div>
            <h1 style={{ fontSize: 18 }}>Flowbase</h1>
            <div style={{ fontSize: 12, color: 'var(--text-low)' }}>Sign in to manage your APIs</div>
          </div>
        </div>

        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && (
          <div style={{ color: 'var(--rose)', fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-low)', lineHeight: 1.6 }}>
          Default credentials are seeded on first boot from your <code>.env</code> file
          (<code>DEFAULT_ADMIN_EMAIL</code> / <code>DEFAULT_ADMIN_PASSWORD</code>).
        </div>
      </form>
    </div>
  );
}

// frontend/pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import Layout from '../components/Layout';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twofaRequired, setTwofaRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twofaCode, setTwofaCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.twofaRequired) {
        setTwofaRequired(true);
        setTempToken(res.data.tempToken);
        setLoading(false);
      } else {
        localStorage.setItem('token', res.data.token);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  const handleTwofaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/2fa/verify', { tempToken, code: twofaCode });
      localStorage.setItem('token', res.data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid 2FA code');
      setLoading(false);
    }
  };

  if (twofaRequired) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">Two-Factor Authentication</h1>
          <p className="text-gray-600 mb-4">Enter the verification code from your authenticator app.</p>
          <form onSubmit={handleTwofaSubmit}>
            <input
              type="text"
              placeholder="6-digit code"
              value={twofaCode}
              onChange={(e) => setTwofaCode(e.target.value)}
              className="w-full border rounded p-2 mb-4"
              required
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button type="submit" disabled={loading} className="w-full btn-primary py-2">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to VelozTrade</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2 mb-3"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2 mb-4"
            required
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button type="submit" disabled={loading} className="w-full btn-primary py-2">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="mt-4 text-center text-sm border-t pt-4">
          Don't have an account?{' '}
          <Link href="/register" className="text-accent font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </Layout>
  );
}
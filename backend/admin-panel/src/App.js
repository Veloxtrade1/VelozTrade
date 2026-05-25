// backend/admin-panel/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token: authToken } = res.data;
      localStorage.setItem('adminToken', authToken);
      setToken(authToken);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setUsers([]);
    setWithdrawals([]);
  };

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [usersRes, withdrawalsRes] = await Promise.all([
          axios.get(`${API_URL}/api/admin/users`, { headers }),
          axios.get(`${API_URL}/api/admin/withdrawals`, { headers })
        ]);
        setUsers(usersRes.data);
        setWithdrawals(withdrawalsRes.data);
      } catch (err) {
        console.error('Failed to fetch data', err);
        if (err.response?.status === 401) logout();
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const approveWithdrawal = async (id) => {
    try {
      await axios.post(`${API_URL}/api/admin/withdrawals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(withdrawals.filter(w => w.id !== id));
    } catch (err) {
      alert('Failed to approve withdrawal');
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '50px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2>VelozTrade Admin Login</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={login}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 10 }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 10 }}
            required
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, background: '#0f2b3d', color: 'white', border: 'none', borderRadius: 4 }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>VelozTrade Admin Panel</h1>
        <button onClick={logout} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4 }}>Logout</button>
      </div>

      <h2>Users ({users.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Email</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Name</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Balance</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>KYC Status</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Blocked</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{user.email}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{user.full_name || '-'}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>${parseFloat(user.balance).toFixed(2)}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{user.kyc_status}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{user.is_blocked ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Pending Withdrawals ({withdrawals.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>User Email</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Amount</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Method</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Address</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Created</th>
            <th style={{ padding: 10, border: '1px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map(w => (
            <tr key={w.id}>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{w.email}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>${parseFloat(w.amount).toFixed(2)}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{w.method || 'N/A'}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{w.address ? w.address.substring(0, 20) + '…' : '-'}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>{new Date(w.created_at).toLocaleString()}</td>
              <td style={{ padding: 8, border: '1px solid #ddd' }}>
                <button onClick={() => approveWithdrawal(w.id)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 4 }}>Approve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function FixAdmin({ user, setUser }) {
  const [username, setUsername] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Pre-fill username with current user
    setUsername(user.username);
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fixAdmin = async () => {
    if (!adminSecret) {
      alert('Please enter ADMIN_SECRET');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/fix-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username || user.username,
          adminSecret: adminSecret
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        alert('Admin status fixed! Please refresh the page.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error fixing admin:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Fix Admin Status 🔧 - FerryMail</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        padding: '20px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '36px', color: '#667eea', margin: '0 0 8px 0' }}>🔧 Fix Admin Status</h1>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>Set or fix admin status for a user</p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={user.username}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>ADMIN_SECRET:</label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Enter ADMIN_SECRET"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
              If ADMIN_SECRET is not set in Vercel, use any value for initial setup.
            </p>
          </div>

          <button
            onClick={fixAdmin}
            disabled={loading || !adminSecret}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: (loading || !adminSecret) ? 'not-allowed' : 'pointer',
              opacity: (loading || !adminSecret) ? 0.6 : 1
            }}
          >
            {loading ? 'Fixing...' : 'Fix Admin Status'}
          </button>
        </div>

        {result && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2>Result:</h2>
            <pre style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

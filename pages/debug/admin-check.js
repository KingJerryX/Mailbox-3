import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminCheck({ user, setUser }) {
  const [checkResult, setCheckResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    checkAdminStatus();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/debug/check-admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCheckResult(data);
      } else {
        const errorData = await res.json();
        setCheckResult({ error: errorData.error });
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setCheckResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const makeAdmin = async () => {
    if (!username) {
      alert('Please enter a username');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/set-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Success! ${username} is now an admin. Please refresh the page.`);
        setUsername('');
        checkAdminStatus();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error setting admin:', err);
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
        <title>Admin Status Check 🔍 - FerryMail</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        padding: '20px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '36px', color: '#667eea', margin: '0 0 8px 0' }}>🔍 Admin Status Check</h1>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>Debug your admin status</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            onClick={checkAdminStatus}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            🔄 Refresh Check
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#667eea' }}>Loading...</div>}

        {checkResult && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2>Current Status</h2>
            <pre style={{
              background: '#f5f5f5',
              padding: '20px',
              borderRadius: '8px',
              overflow: 'auto'
            }}>
              {JSON.stringify(checkResult, null, 2)}
            </pre>
          </div>
        )}

        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2>Make User Admin</h2>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username to make admin"
              style={{
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                flex: 1
              }}
            />
            <button
              onClick={makeAdmin}
              disabled={loading || !username}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: (loading || !username) ? 'not-allowed' : 'pointer',
                opacity: (loading || !username) ? 0.6 : 1
              }}
            >
              Make Admin
            </button>
          </div>
          <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '14px' }}>
            Note: You need to be an admin or provide ADMIN_SECRET to use this feature.
          </p>
        </div>
      </div>
    </>
  );
}

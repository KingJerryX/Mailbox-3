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

  const [adminSecret, setAdminSecret] = useState('');

  const makeAdmin = async () => {
    const targetUsername = username || user.username;

    if (!adminSecret) {
      alert('Please enter ADMIN_SECRET. If you haven\'t set it in Vercel, you can use any value for initial setup.');
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/setup/make-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: targetUsername,
          adminSecret: adminSecret
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Success! ${targetUsername} is now an admin. The page will refresh in 2 seconds to update your status.`);
        setUsername('');
        setAdminSecret('');
        checkAdminStatus();
        // Refresh the page after 2 seconds to update user state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(`Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
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
          <div style={{
            background: '#fff3cd',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #ffc107'
          }}>
            <strong>Setup Instructions:</strong>
            <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Set <code>ADMIN_SECRET</code> in Vercel Environment Variables (optional for initial setup)</li>
              <li>Enter the ADMIN_SECRET below (or any value if not set in Vercel)</li>
              <li>Enter username (or leave blank to make yourself admin)</li>
              <li>Click "Make Admin"</li>
              <li>Log out and log back in to see the admin link</li>
            </ol>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Enter ADMIN_SECRET (or any value for initial setup)"
              style={{
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                width: '100%'
              }}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={`Enter username (or leave blank for: ${user.username})`}
              style={{
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                width: '100%'
              }}
            />
            <button
              onClick={makeAdmin}
              disabled={loading || !adminSecret}
              style={{
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
              Make Admin
            </button>
          </div>
          <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '14px' }}>
            <strong>Note:</strong> If ADMIN_SECRET is not set in Vercel, you can use any value for initial setup.
            After setting ADMIN_SECRET in Vercel, you must use that exact value.
          </p>
        </div>
      </div>
    </>
  );
}

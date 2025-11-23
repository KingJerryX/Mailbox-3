import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/admin.module.css';

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

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔍 Admin Status Check</h1>
          <p className={styles.subtitle}>Debug your admin status</p>
        </div>

        <div className={styles.actions}>
          <button onClick={checkAdminStatus} className={styles.refreshBtn} disabled={loading}>
            🔄 Refresh Check
          </button>
        </div>

        {loading && <div className={styles.loading}>Loading...</div>}

        {checkResult && (
          <div className={styles.tableContainer}>
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

        <div className={styles.tableContainer}>
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
              className={styles.refreshBtn}
              disabled={loading || !username}
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

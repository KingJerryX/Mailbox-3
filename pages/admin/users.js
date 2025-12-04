import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminUsers({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    const isAdmin = user.is_admin === true ||
                   user.is_admin === 'true' ||
                   user.is_admin === 1 ||
                   user.is_admin === '1';

    if (!isAdmin) {
      setError('Admin access required');
      setLoading(false);
      return;
    }

    fetchUsers();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setError(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
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
        <title>Admin - View Users 🔍 - FerryMail</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        padding: '20px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '36px', color: '#667eea', margin: '0 0 8px 0' }}>🔍 User Database</h1>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>View all registered users</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#667eea' }}>Loading users...</div>
        ) : error ? (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #fcc'
          }}>{error}</div>
        ) : (
          <>
            <div style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #ffc107'
            }}>
              <strong>⚠️ Security Note:</strong> Passwords are hashed using bcrypt and cannot be viewed in plain text. This is a security feature to protect user accounts.
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                flex: 1
              }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>{users.length}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Users</div>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              overflowX: 'auto',
              marginBottom: '20px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}>
                  <tr>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>ID</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Username</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Password Hash</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#9ca3af',
                        fontStyle: 'italic'
                      }}>No users found</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} style={{
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <td style={{ padding: '16px', fontSize: '14px' }}>{u.id}</td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600, color: '#667eea' }}>{u.username}</td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <code style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '12px',
                            color: '#6b7280',
                            display: 'block',
                            marginBottom: '4px'
                          }}>{u.password_hash.substring(0, 30)}...</code>
                          <small style={{ color: '#9ca3af', fontStyle: 'italic' }}>(bcrypt hash, cannot be reversed)</small>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>{new Date(u.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={fetchUsers}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🔄 Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

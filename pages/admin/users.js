import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/admin.module.css';

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

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔍 User Database</h1>
          <p className={styles.subtitle}>View all registered users</p>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading users...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            <div className={styles.warning}>
              <strong>⚠️ Security Note:</strong> Passwords are hashed using bcrypt and cannot be viewed in plain text. This is a security feature to protect user accounts.
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{users.length}</div>
                <div className={styles.statLabel}>Total Users</div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Password Hash</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className={styles.noData}>No users found</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td className={styles.username}>{u.username}</td>
                        <td className={styles.passwordHash}>
                          <code>{u.password_hash.substring(0, 30)}...</code>
                          <small>(bcrypt hash, cannot be reversed)</small>
                        </td>
                        <td>{new Date(u.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.actions}>
              <button onClick={fetchUsers} className={styles.refreshBtn}>
                🔄 Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

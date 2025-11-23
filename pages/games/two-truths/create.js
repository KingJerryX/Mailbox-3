import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../../styles/games.module.css';

export default function CreateTTL({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    receiverId: '',
    truth1: '',
    truth2: '',
    lie: ''
  });
  const [notification, setNotification] = useState(null);
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
      const token = getToken();
      const res = await fetch('/api/mailbox/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.receiverId || !formData.truth1.trim() || !formData.truth2.trim() || !formData.lie.trim()) {
      showNotification('Please fill in all fields!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/ttl/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: parseInt(formData.receiverId),
          truth1: formData.truth1.trim(),
          truth2: formData.truth2.trim(),
          lie: formData.lie.trim()
        })
      });

      if (res.ok) {
        showNotification('🎉 Game sent!', 'success');
        setFormData({
          receiverId: '',
          truth1: '',
          truth2: '',
          lie: ''
        });
        setTimeout(() => {
          router.push('/games');
        }, 1500);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        showNotification(`Failed to create game: ${errorData.error}`, 'error');
      }
    } catch (err) {
      console.error('Error creating game:', err);
      showNotification('Error creating game', 'error');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Create Two Truths & a Lie 🎯 - FerryMail</title>
      </Head>

      <div className={styles.container}>
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            {notification.message}
          </div>
        )}

        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push('/games')}
          >
            ← Back to Games
          </button>
          <h1 className={styles.title}>🎯 Create Two Truths & a Lie</h1>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Send to
              <select
                value={formData.receiverId}
                onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                required
                className={styles.select}
              >
                <option value="">Select recipient...</option>
                {users.filter(u => u.id !== user.id).map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Truth #1 *
              <textarea
                value={formData.truth1}
                onChange={(e) => setFormData({ ...formData, truth1: e.target.value })}
                required
                className={styles.textarea}
                placeholder="Enter your first truth..."
                rows="3"
              />
            </label>

            <label className={styles.label}>
              Truth #2 *
              <textarea
                value={formData.truth2}
                onChange={(e) => setFormData({ ...formData, truth2: e.target.value })}
                required
                className={styles.textarea}
                placeholder="Enter your second truth..."
                rows="3"
              />
            </label>

            <label className={styles.label}>
              Lie *
              <textarea
                value={formData.lie}
                onChange={(e) => setFormData({ ...formData, lie: e.target.value })}
                required
                className={styles.textarea}
                placeholder="Enter your lie..."
                rows="3"
              />
            </label>

            <button type="submit" className={styles.submitButton}>
              🚀 Send Game
            </button>
          </form>
        </div>
      </div>
    </>
  );
}


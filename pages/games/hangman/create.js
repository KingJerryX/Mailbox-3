import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../../styles/games.module.css';

export default function CreateHangman({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    recipientId: '',
    targetWord: '',
    hint: '',
    allowedWrongGuesses: 6
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
    if (!formData.recipientId || !formData.targetWord.trim()) {
      showNotification('Please fill in all required fields!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/hangman/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: parseInt(formData.recipientId),
          targetWord: formData.targetWord.trim(),
          hint: formData.hint.trim() || null,
          allowedWrongGuesses: parseInt(formData.allowedWrongGuesses)
        })
      });

      const data = await res.json();

      if (res.ok) {
        showNotification('🎉 Game sent to partner!', 'success');
        setFormData({
          recipientId: '',
          targetWord: '',
          hint: '',
          allowedWrongGuesses: 6
        });
        setTimeout(() => {
          router.push('/games');
        }, 1500);
      } else {
        showNotification(`Failed to create game: ${data.error || 'Unknown error'}`, 'error');
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
        <title>Create Hangman Game 🎯 - FerryMail</title>
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
          <h1 className={styles.title}>🎯 Create Hangman Game</h1>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Send to *
              <select
                value={formData.recipientId}
                onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
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
              Word to Guess *
              <input
                type="text"
                value={formData.targetWord}
                onChange={(e) => setFormData({ ...formData, targetWord: e.target.value })}
                required
                className={styles.input}
                placeholder="Enter a word (must be a valid English word)..."
                maxLength={50}
              />
            </label>

            <label className={styles.label}>
              Hint (Optional)
              <input
                type="text"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                className={styles.input}
                placeholder="Enter a hint for your partner..."
                maxLength={200}
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                Hint will be revealed after 4 wrong guesses
              </small>
            </label>

            <label className={styles.label}>
              Allowed Wrong Guesses *
              <select
                value={formData.allowedWrongGuesses}
                onChange={(e) => setFormData({ ...formData, allowedWrongGuesses: parseInt(e.target.value) })}
                required
                className={styles.select}
              >
                <option value={6}>6 guesses (Easy)</option>
                <option value={9}>9 guesses (Hard)</option>
              </select>
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



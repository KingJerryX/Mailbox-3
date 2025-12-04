import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/mailbox.module.css';

export default function Archive({ user }) {
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchArchivedNotes();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchArchivedNotes = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/love-notes/archived', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Error loading archived notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const token = getToken();
      const res = await fetch('/api/love-notes/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ noteId })
      });

      if (res.ok) {
        setArchivedNotes(prev => prev.filter(note => note.id !== noteId));
        showNotification('🗑️ Love note deleted', 'success');
        setShowDeleteConfirm(null);
      } else {
        showNotification('Failed to delete love note', 'error');
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      showNotification('Error deleting love note', 'error');
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading archived notes...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Archive 📦 - FerryMail</title>
      </Head>

      <div className={styles.container}>
        {/* Notification */}
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            <span className={styles.notificationIcon}>
              {notification.type === 'success' ? '✨' :
               notification.type === 'error' ? '⚠️' : '💌'}
            </span>
            <span>{notification.message}</span>
            <button
              className={styles.notificationClose}
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2>⚠️ Delete Love Note</h2>
              <p>Are you sure you want to permanently delete this love note? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  className={styles.btnSend}
                  onClick={() => handleDeleteNote(showDeleteConfirm)}
                  style={{ backgroundColor: '#ef4444' }}
                >
                  Yes, Delete
                </button>
                <button
                  className={styles.btnCancel}
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>📦 Archive</h1>
          <p className={styles.subtitle}>Your archived love notes</p>
        </div>

        {archivedNotes.length === 0 ? (
          <div className={styles.emptyMailbox}>
            <div className={styles.emptyIcon}>📭</div>
            <p>No archived notes yet. Archive notes from your mailbox to see them here!</p>
          </div>
        ) : (
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px',
            padding: '20px'
          }}>
            {archivedNotes.map((note) => {
              const tilt = (Math.random() * 4 - 2).toFixed(1);
              return (
                <div
                  key={note.id}
                  className={styles.loveNote}
                  style={{
                    backgroundColor: note.bg_color,
                    '--tilt': `${tilt}deg`,
                    position: 'relative',
                    padding: '20px',
                    minHeight: '150px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div className={styles.noteTape}></div>
                  <button
                    className={styles.noteClose}
                    onClick={() => setShowDeleteConfirm(note.id)}
                    title="Delete this note"
                    style={{ position: 'absolute', top: '8px', right: '8px' }}
                  >
                    🗑️
                  </button>
                  <div className={styles.noteContent}>{note.content}</div>
                  {note.sender_username && (
                    <div className={styles.noteSender}>— {note.sender_username}</div>
                  )}
                  <div style={{
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#6b7280',
                    fontStyle: 'italic'
                  }}>
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

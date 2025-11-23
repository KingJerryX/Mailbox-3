import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/mailbox.module.css';

export default function Archive({ user }) {
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
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

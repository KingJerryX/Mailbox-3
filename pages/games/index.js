import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/games.module.css';

export default function Games({ user, setUser }) {
  const [pendingGames, setPendingGames] = useState([]);
  const [stats, setStats] = useState({ total_games: 0, correct_guesses: 0 });
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPendingGames();
    fetchStats();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchPendingGames = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/ttl/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingGames(data.games || []);
      }
    } catch (err) {
      console.error('Error fetching pending games:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/ttl/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  if (!user) {
    return null;
  }

  const accuracy = stats.total_games > 0
    ? Math.round((stats.correct_guesses / stats.total_games) * 100)
    : 0;

  return (
    <>
      <Head>
        <title>Games 🎮 - FerryMail</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>🎮 Games</h1>
          <p className={styles.subtitle}>Play fun games together!</p>
        </div>

        {/* Stats Section */}
        <div className={styles.statsCard}>
          <h2 className={styles.statsTitle}>Two Truths & a Lie Stats</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{stats.correct_guesses}</div>
              <div className={styles.statLabel}>Correct Guesses</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{stats.total_games}</div>
              <div className={styles.statLabel}>Total Games</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{accuracy}%</div>
              <div className={styles.statLabel}>Accuracy</div>
            </div>
          </div>
          {stats.total_games > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${accuracy}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Game Cards */}
        <div className={styles.gamesGrid}>
          <Link href="/games/two-truths/create" className={styles.gameCard}>
            <div className={styles.gameIcon}>🎯</div>
            <h3 className={styles.gameTitle}>Two Truths & a Lie</h3>
            <p className={styles.gameDescription}>
              Create a game with 2 truths and 1 lie, then challenge your partner to guess!
            </p>
            <div className={styles.gameAction}>Create Game →</div>
          </Link>
        </div>

        {/* Pending Games */}
        {pendingGames.length > 0 && (
          <div className={styles.pendingSection}>
            <h2 className={styles.sectionTitle}>📬 Pending Games</h2>
            <div className={styles.pendingGamesList}>
              {pendingGames.map(game => (
                <Link
                  key={game.id}
                  href={`/games/two-truths/play/${game.id}`}
                  className={styles.pendingGameCard}
                >
                  <div className={styles.pendingGameHeader}>
                    <span className={styles.pendingGameFrom}>
                      From: {game.creator_username}
                    </span>
                    <span className={styles.pendingGameDate}>
                      {new Date(game.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.pendingGameAction}>Play Now →</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

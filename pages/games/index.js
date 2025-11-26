import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/games.module.css';

export default function Games({ user, setUser }) {
  const [pendingTTLGames, setPendingTTLGames] = useState([]);
  const [pendingHangmanGames, setPendingHangmanGames] = useState([]);
  const [ttlStats, setTtlStats] = useState({ total_games: 0, correct_guesses: 0 });
  const [hangmanStats, setHangmanStats] = useState({ games_played: 0, games_won: 0, win_percentage: 0 });
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPendingTTLGames();
    fetchPendingHangmanGames();
    fetchTTLStats();
    fetchHangmanStats();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchPendingTTLGames = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/ttl/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingTTLGames(data.games || []);
      }
    } catch (err) {
      console.error('Error fetching pending TTL games:', err);
    }
  };

  const fetchPendingHangmanGames = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/hangman/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingHangmanGames(data.games || []);
      }
    } catch (err) {
      console.error('Error fetching pending hangman games:', err);
    }
  };

  const fetchTTLStats = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/ttl/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTtlStats(data);
      }
    } catch (err) {
      console.error('Error fetching TTL stats:', err);
    }
  };

  const fetchHangmanStats = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/hangman/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHangmanStats(data);
      }
    } catch (err) {
      console.error('Error fetching hangman stats:', err);
    }
  };

  if (!user) {
    return null;
  }

  const ttlAccuracy = ttlStats.total_games > 0
    ? Math.round((ttlStats.correct_guesses / ttlStats.total_games) * 100)
    : 0;

  const allPendingGames = [
    ...pendingTTLGames.map(g => ({ ...g, type: 'ttl' })),
    ...pendingHangmanGames.map(g => ({ ...g, type: 'hangman' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

        {/* Pending Games - Moved to Top */}
        {allPendingGames.length > 0 && (
          <div className={styles.pendingSection}>
            <h2 className={styles.sectionTitle}>📬 Pending Games</h2>
            <div className={styles.pendingGamesList}>
              {allPendingGames.map(game => (
                <Link
                  key={`${game.type}-${game.id}`}
                  href={game.type === 'ttl'
                    ? `/games/two-truths/play/${game.id}`
                    : `/games/hangman/play/${game.id}`
                  }
                  className={styles.pendingGameCard}
                >
                  <div className={styles.pendingGameHeader}>
                    <span className={styles.pendingGameFrom}>
                      {game.type === 'ttl' ? '🎯' : '🤔'} From: {game.creator_username}
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

          <Link href="/games/hangman/create" className={styles.gameCard}>
            <div className={styles.gameIcon}>🤔</div>
            <h3 className={styles.gameTitle}>Hangman</h3>
            <p className={styles.gameDescription}>
              Create a word puzzle and challenge your partner to guess it letter by letter!
            </p>
            <div className={styles.gameAction}>Create Game →</div>
          </Link>
        </div>

        {/* Stats Section - Moved to Bottom and Smaller */}
        <div className={styles.statsCard}>
          <h2 className={styles.statsTitle}>Two Truths & a Lie Stats</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{ttlStats.correct_guesses}</div>
              <div className={styles.statLabel}>Correct Guesses</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{ttlStats.total_games}</div>
              <div className={styles.statLabel}>Total Games</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{ttlAccuracy}%</div>
              <div className={styles.statLabel}>Accuracy</div>
            </div>
          </div>
          {ttlStats.total_games > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${ttlAccuracy}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className={styles.statsCard}>
          <h2 className={styles.statsTitle}>Hangman Stats</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{hangmanStats.games_won}</div>
              <div className={styles.statLabel}>Games Won</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{hangmanStats.games_played}</div>
              <div className={styles.statLabel}>Games Played</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{hangmanStats.win_percentage.toFixed(1)}%</div>
              <div className={styles.statLabel}>Win Percentage</div>
            </div>
          </div>
          {hangmanStats.games_played > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${hangmanStats.win_percentage}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

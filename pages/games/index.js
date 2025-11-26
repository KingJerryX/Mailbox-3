import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/games.module.css';

export default function Games({ user, setUser }) {
  const [pendingTTLGames, setPendingTTLGames] = useState([]);
  const [pendingHangmanGames, setPendingHangmanGames] = useState([]);
  const [sentTTLGames, setSentTTLGames] = useState([]);
  const [sentHangmanGames, setSentHangmanGames] = useState([]);
  const [ttlStats, setTtlStats] = useState({ total_games: 0, correct_guesses: 0 });
  const [hangmanStats, setHangmanStats] = useState({ games_played: 0, games_won: 0, win_percentage: 0 });
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('games'); // 'games', 'requests', or 'pending'
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPendingTTLGames();
    fetchPendingHangmanGames();
    fetchSentTTLGames();
    fetchSentHangmanGames();
    fetchTTLStats();
    fetchHangmanStats();
  }, [user]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

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

  const fetchSentTTLGames = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/ttl/sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSentTTLGames(data.games || []);
      }
    } catch (err) {
      console.error('Error fetching sent TTL games:', err);
    }
  };

  const fetchSentHangmanGames = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/hangman/sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSentHangmanGames(data.games || []);
      }
    } catch (err) {
      console.error('Error fetching sent hangman games:', err);
    }
  };

  const handleWithdraw = async (gameId, type) => {
    if (!confirm('Are you sure you want to withdraw this game?')) {
      return;
    }

    try {
      const token = getToken();
      const endpoint = type === 'ttl'
        ? `/api/ttl/${gameId}/withdraw`
        : `/api/hangman/${gameId}/withdraw`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification('✅ Game withdrawn successfully', 'success');
        fetchSentTTLGames();
        fetchSentHangmanGames();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to withdraw game', 'error');
      }
    } catch (err) {
      console.error('Error withdrawing game:', err);
      showNotification('Error withdrawing game', 'error');
    }
  };

  const handleDecline = async (gameId, type, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to decline this game?')) {
      return;
    }

    try {
      const token = getToken();
      const endpoint = type === 'ttl'
        ? `/api/ttl/${gameId}/decline`
        : `/api/hangman/${gameId}/decline`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification('✅ Game declined successfully', 'success');
        fetchPendingTTLGames();
        fetchPendingHangmanGames();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to decline game', 'error');
      }
    } catch (err) {
      console.error('Error declining game:', err);
      showNotification('Error declining game', 'error');
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

  const allSentGames = [
    ...sentTTLGames.map(g => ({ ...g, type: 'ttl' })),
    ...sentHangmanGames.map(g => ({ ...g, type: 'hangman' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <>
      <Head>
        <title>Games 🎮 - FerryMail</title>
      </Head>

      <div className={styles.container}>
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            {notification.message}
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>🎮 Games</h1>
          <p className={styles.subtitle}>Play fun games together!</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'games' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('games')}
          >
            🎮 Games
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            📬 Game Requests
            {allPendingGames.length > 0 && (
              <span className={styles.tabBadge}>{allPendingGames.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            📤 Pending Games
            {allSentGames.length > 0 && (
              <span className={styles.tabBadge}>{allSentGames.length}</span>
            )}
          </button>
        </div>

        {/* Games Tab - Game options and stats */}
        {activeTab === 'games' && (
          <div className={styles.tabContent}>
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

            {/* Stats Section */}
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
        )}

        {/* Game Requests Tab - Games sent to player */}
        {activeTab === 'requests' && (
          <div className={styles.tabContent}>
            {allPendingGames.length > 0 ? (
              <div className={styles.pendingSection}>
                <h2 className={styles.sectionTitle}>📬 Game Requests</h2>
                <p className={styles.sectionSubtitle}>Games others have sent to you</p>
                <div className={styles.pendingGamesList}>
                  {allPendingGames.map(game => (
                    <div key={`${game.type}-${game.id}`} className={styles.pendingGameCard}>
                      <Link
                        href={game.type === 'ttl'
                          ? `/games/two-truths/play/${game.id}`
                          : `/games/hangman/play/${game.id}`
                        }
                        className={styles.pendingGameLink}
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
                      <button
                        className={styles.declineButton}
                        onClick={(e) => handleDecline(game.id, game.type, e)}
                        title="Decline game"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <p>No game requests at the moment</p>
              </div>
            )}
          </div>
        )}

        {/* Pending Games Tab - Games sent by player */}
        {activeTab === 'pending' && (
          <div className={styles.tabContent}>
            {allSentGames.length > 0 ? (
              <div className={styles.pendingSection}>
                <h2 className={styles.sectionTitle}>📤 Pending Games</h2>
                <p className={styles.sectionSubtitle}>Games you have sent to others</p>
                <div className={styles.pendingGamesList}>
                  {allSentGames.map(game => (
                    <div key={`sent-${game.type}-${game.id}`} className={styles.pendingGameCard}>
                      <div className={styles.pendingGameHeader}>
                        <span className={styles.pendingGameFrom}>
                          {game.type === 'ttl' ? '🎯' : '🤔'} To: {game.recipient_username || game.receiver_username}
                        </span>
                        <span className={styles.pendingGameDate}>
                          {new Date(game.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        className={styles.withdrawButton}
                        onClick={() => handleWithdraw(game.id, game.type)}
                        title="Withdraw game"
                      >
                        ↶ Withdraw
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <p>No pending games. Create a game to send to someone!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

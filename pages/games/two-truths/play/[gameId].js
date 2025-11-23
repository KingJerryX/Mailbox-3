import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../../../styles/games.module.css';

export default function PlayTTL({ user, setUser }) {
  const [game, setGame] = useState(null);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { gameId } = router.query;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (gameId) {
      fetchGame();
    }
  }, [user, gameId]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchGame = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/ttl/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const foundGame = data.games?.find(g => g.id === parseInt(gameId));
        if (foundGame) {
          setGame(foundGame);
          // Shuffle the options
          const options = shuffleArray([foundGame.truth1, foundGame.truth2, foundGame.lie]);
          setShuffledOptions(options);
        } else {
          // Game might already be guessed or doesn't exist
          setResult({ error: 'Game not found or already completed' });
        }
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      setResult({ error: 'Failed to load game' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (choice) => {
    if (selectedChoice || result) return; // Already guessed

    setSelectedChoice(choice);

    try {
      const token = getToken();
      const res = await fetch(`/api/ttl/guess/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ choice })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setResult({ error: errorData.error || 'Failed to submit guess' });
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
      setResult({ error: 'Error submitting guess' });
    }
  };

  if (!user || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading game... 🎮</div>
      </div>
    );
  }

  if (!game && result?.error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>⚠️ {result.error}</h2>
          <button
            className={styles.backButton}
            onClick={() => router.push('/games')}
          >
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Play Two Truths & a Lie 🎯 - FerryMail</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.push('/games')}
          >
            ← Back to Games
          </button>
          <h1 className={styles.title}>🎯 Two Truths & a Lie</h1>
          <p className={styles.subtitle}>From: {game?.creator_username}</p>
        </div>

        {!result ? (
          <div className={styles.playCard}>
            <h2 className={styles.playTitle}>Which one is the lie?</h2>
            <div className={styles.optionsGrid}>
              {shuffledOptions.map((option, index) => (
                <button
                  key={index}
                  className={`${styles.optionCard} ${selectedChoice === option ? styles.selected : ''}`}
                  onClick={() => handleGuess(option)}
                  disabled={selectedChoice !== null}
                >
                  <div className={styles.optionNumber}>{index + 1}</div>
                  <div className={styles.optionText}>{option}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.resultCard}>
            {result.wasCorrect !== undefined ? (
              <>
                <div className={`${styles.resultTitle} ${result.wasCorrect ? styles.correct : styles.incorrect}`}>
                  {result.wasCorrect ? '🎉 THAT\'S RIGHT!' : '❌ INCORRECT'}
                </div>

                <div className={styles.resultDetails}>
                  <div className={styles.resultMessage}>
                    {result.wasCorrect
                      ? 'You guessed correctly! Great job! 🎊'
                      : 'Oops! That wasn\'t the lie.'
                    }
                  </div>

                  <div className={styles.realLie}>
                    <strong>The real lie was:</strong>
                    <div className={styles.lieText}>{result.realLie}</div>
                  </div>

                  <div className={styles.optionsGrid}>
                    {shuffledOptions.map((option, index) => {
                      let cardClass = styles.optionCard;
                      if (option === selectedChoice) {
                        cardClass += result.wasCorrect ? ` ${styles.correctChoice}` : ` ${styles.wrongChoice}`;
                      }
                      if (option === result.realLie) {
                        cardClass += ` ${styles.realLieCard}`;
                      }
                      return (
                        <div key={index} className={cardClass}>
                          <div className={styles.optionNumber}>{index + 1}</div>
                          <div className={styles.optionText}>{option}</div>
                          {option === selectedChoice && (
                            <div className={styles.choiceLabel}>
                              {result.wasCorrect ? '✓ Your Guess' : '✗ Your Guess'}
                            </div>
                          )}
                          {option === result.realLie && (
                            <div className={styles.choiceLabel}>🎯 The Lie</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  className={styles.backButton}
                  onClick={() => router.push('/games')}
                >
                  ← Back to Games
                </button>
              </>
            ) : (
              <div className={styles.errorMessage}>
                <h2>⚠️ {result.error || 'An error occurred'}</h2>
                <button
                  className={styles.backButton}
                  onClick={() => router.push('/games')}
                >
                  ← Back to Games
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

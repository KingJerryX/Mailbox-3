import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../../../styles/hangman.module.css';

export default function PlayHangman({ user, setUser }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guessingLetter, setGuessingLetter] = useState('');
  const [guessingWord, setGuessingWord] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [flipLetters, setFlipLetters] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const prevRevealedLettersRef = useRef([]);
  const router = useRouter();
  const { gameId } = router.query;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (gameId) {
      fetchGame();
      // Poll for updates every 2 seconds if game is in progress
      const interval = setInterval(() => {
        if (game?.game_status === 'in_progress') {
          fetchGame();
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [user, gameId]);

  useEffect(() => {
    // Check if hint should be available (4 wrong guesses)
    if (game && game.current_wrong_guesses >= 4 && game.hint && !showHint) {
      // Hint becomes available but user needs to click to reveal
    }
  }, [game]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchGame = async () => {
    try {
      const token = getToken();
      const res = await fetch(`/api/hangman/${gameId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();

        // Check for newly revealed letters for flip effect (only once per letter)
        if (data.game.revealed_letters) {
          const currentRevealed = data.game.revealed_letters;
          const prevRevealed = prevRevealedLettersRef.current;
          const newRevealed = currentRevealed.filter(
            letter => !prevRevealed.includes(letter)
          );

          if (newRevealed.length > 0) {
            newRevealed.forEach(letter => {
              setFlipLetters(prev => new Set([...prev, letter]));
              setTimeout(() => {
                setFlipLetters(prev => {
                  const next = new Set(prev);
                  next.delete(letter);
                  return next;
                });
              }, 600); // Match animation duration
            });
            prevRevealedLettersRef.current = currentRevealed;
          }
        }

        setGame(data.game);
      } else {
        const errorData = await res.json();
        showNotification(`Error: ${errorData.error}`, 'error');
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      showNotification('Error loading game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGuessLetter = async (letter) => {
    if (!letter || letter.length !== 1) return;

    try {
      const token = getToken();
      const res = await fetch(`/api/hangman/${gameId}/guess-letter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ letter })
      });

      const data = await res.json();

      if (res.ok) {
        setGame(data.game);
        setGuessingLetter('');
        if (data.game.game_status === 'won') {
          showNotification('🎉 You won!', 'success');
        } else if (data.game.game_status === 'lost') {
          showNotification('😢 Game over!', 'error');
        }
      } else {
        showNotification(data.error || 'Invalid guess', 'error');
      }
    } catch (err) {
      console.error('Error guessing letter:', err);
      showNotification('Error making guess', 'error');
    }
  };

  const handleGuessWord = async (e) => {
    e.preventDefault();
    if (!guessingWord.trim()) {
      showNotification('Please enter a word', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`/api/hangman/${gameId}/guess-word`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: guessingWord.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setGame(data.game);
        setGuessingWord('');
        if (data.game.game_status === 'won') {
          showNotification('🎉 You won!', 'success');
        } else if (data.game.game_status === 'lost') {
          showNotification('😢 Game over!', 'error');
        }
      } else {
        showNotification(data.error || 'Invalid guess', 'error');
      }
    } catch (err) {
      console.error('Error guessing word:', err);
      showNotification('Error making guess', 'error');
    }
  };

  const handleRevealHint = () => {
    setShowHint(true);
  };

  const renderHangman = () => {
    if (!game) return null;

    const wrongGuesses = game.current_wrong_guesses;
    const maxParts = game.allowed_wrong_guesses === 9 ? 9 : 6;

    return (
      <div className={styles.hangmanDrawing}>
        <svg viewBox="0 0 200 250" className={styles.hangmanSvg}>
          {/* Gallows */}
          <line x1="20" y1="230" x2="80" y2="230" stroke="#8B4513" strokeWidth="4" />
          <line x1="50" y1="230" x2="50" y2="20" stroke="#8B4513" strokeWidth="4" />
          <line x1="50" y1="20" x2="150" y2="20" stroke="#8B4513" strokeWidth="4" />
          <line x1="150" y1="20" x2="150" y2="50" stroke="#8B4513" strokeWidth="4" />

          {/* Head */}
          {wrongGuesses >= 1 && (
            <circle cx="150" cy="70" r="20" stroke="#000" strokeWidth="3" fill="none" />
          )}

          {/* Body */}
          {wrongGuesses >= 2 && (
            <line x1="150" y1="90" x2="150" y2="150" stroke="#000" strokeWidth="3" />
          )}

          {/* Left Arm */}
          {wrongGuesses >= 3 && (
            <line x1="150" y1="110" x2="120" y2="130" stroke="#000" strokeWidth="3" />
          )}

          {/* Right Arm */}
          {wrongGuesses >= 4 && (
            <line x1="150" y1="110" x2="180" y2="130" stroke="#000" strokeWidth="3" />
          )}

          {/* Left Leg */}
          {wrongGuesses >= 5 && (
            <line x1="150" y1="150" x2="120" y2="180" stroke="#000" strokeWidth="3" />
          )}

          {/* Right Leg */}
          {wrongGuesses >= 6 && (
            <line x1="150" y1="150" x2="180" y2="180" stroke="#000" strokeWidth="3" />
          )}

          {/* Left Eye (9-guess mode) */}
          {wrongGuesses >= 7 && game.allowed_wrong_guesses === 9 && (
            <circle cx="145" cy="65" r="2" fill="#000" />
          )}

          {/* Right Eye (9-guess mode) */}
          {wrongGuesses >= 8 && game.allowed_wrong_guesses === 9 && (
            <circle cx="155" cy="65" r="2" fill="#000" />
          )}

          {/* Mouth (9-guess mode) */}
          {wrongGuesses >= 9 && game.allowed_wrong_guesses === 9 && (
            <path d="M 140 75 Q 150 80 160 75" stroke="#000" strokeWidth="2" fill="none" />
          )}
        </svg>
      </div>
    );
  };

  const renderAlphabet = () => {
    if (!game) return null;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return (
      <div className={styles.alphabetGrid}>
        {alphabet.map(letter => {
          const lowerLetter = letter.toLowerCase();
          const isGuessed = game.guessed_letters.includes(lowerLetter);
          const isRevealed = game.revealed_letters.includes(lowerLetter);
          const isDisabled = isGuessed || game.game_status !== 'in_progress';
          const isFlipping = flipLetters.has(lowerLetter);

          return (
            <button
              key={letter}
              className={`${styles.letterButton} ${
                isRevealed ? styles.letterRevealed :
                isGuessed && !isRevealed ? styles.letterWrong : ''
              } ${isFlipping ? styles.letterFlip : ''}`}
              onClick={() => !isDisabled && handleGuessLetter(letter)}
              disabled={isDisabled}
            >
              {letter}
            </button>
          );
        })}
      </div>
    );
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Game not found</div>
      </div>
    );
  }

  const isWon = game.game_status === 'won';
  const isLost = game.game_status === 'lost';
  const isInProgress = game.game_status === 'in_progress';
  const canRevealHint = game.current_wrong_guesses >= 4 && game.hint && !showHint && isInProgress;

  return (
    <>
      <Head>
        <title>Play Hangman 🎯 - FerryMail</title>
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
            🏠 Return to Main Menu
          </button>
          <h1 className={styles.title}>🎯 Hangman</h1>
          <p className={styles.subtitle}>
            From: {game.creator_username} | Remaining Guesses: {game.remaining_guesses}
          </p>
        </div>

        {/* Hint Section */}
        {canRevealHint && (
          <div className={styles.hintSection}>
            <button onClick={handleRevealHint} className={styles.hintButton}>
              💡 Reveal Hint
            </button>
          </div>
        )}

        {showHint && game.hint && (
          <div className={styles.hintDisplay}>
            <strong>💡 Hint:</strong> {game.hint}
          </div>
        )}

        {/* Hangman Drawing */}
        <div className={styles.hangmanSection}>
          {renderHangman()}
        </div>

        {/* Word Display */}
        <div className={styles.wordDisplay}>
          <div
            className={styles.maskedWord}
            style={{
              fontSize: (game.masked_word || '').replace(/\s/g, '').length > 8
                ? 'clamp(24px, 4vw, 48px)'
                : 'clamp(32px, 5vw, 48px)'
            }}
          >
            {(game.masked_segments || game.masked_word.split(' ')).map((char, idx) => {
              const isSpace = char === ' ';
              const letter = !isSpace && char !== '_' ? char.toLowerCase() : null;
              const isFlipping = letter && flipLetters.has(letter);
              return (
                <span
                  key={`${char}-${idx}`}
                  className={`${styles.wordChar} ${isSpace ? styles.wordSpace : ''} ${isFlipping ? styles.charFlip : ''}`}
                >
                  {isSpace ? '\u00A0' : char}
                </span>
              );
            })}
          </div>
        </div>

        {/* Game Status Messages */}
        {isWon && (
          <div className={styles.resultMessage}>
            <div className={styles.confetti}>🎉</div>
            <h2>😄 You guessed correctly!</h2>
            <p>The word was: <strong>{game.target_word.toUpperCase()}</strong></p>
            <button
              className={styles.mainMenuButton}
              onClick={() => router.push('/games')}
            >
              🏠 Return to Main Menu
            </button>
          </div>
        )}

        {isLost && (
          <div className={styles.resultMessage}>
            <div className={styles.sadFace}>😢</div>
            <h2>Game Over!</h2>
            <p>The correct word was: <strong>{game.target_word.toUpperCase()}</strong></p>
            <button
              className={styles.mainMenuButton}
              onClick={() => router.push('/games')}
            >
              🏠 Return to Main Menu
            </button>
          </div>
        )}

        {/* Alphabet Grid */}
        {isInProgress && (
          <>
            <div className={styles.alphabetSection}>
              <h3>Guess a Letter</h3>
              {renderAlphabet()}
            </div>

            {/* Word Guess Form */}
            <div className={styles.wordGuessSection}>
              <h3>Or Guess the Full Word</h3>
              <form onSubmit={handleGuessWord} className={styles.wordGuessForm}>
                <input
                  type="text"
                  value={guessingWord}
                  onChange={(e) => setGuessingWord(e.target.value.toLowerCase())}
                  placeholder="Enter word..."
                  className={styles.wordInput}
                  maxLength={50}
                />
                <button type="submit" className={styles.wordGuessButton}>
                  Guess Word
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}

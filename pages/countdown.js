import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import styles from '../styles/countdown.module.css';

export default function Countdown({ user, setUser }) {
  const [timers, setTimers] = useState([]);
  const [selectedTimer, setSelectedTimer] = useState(null);
  const [countdownDisplay, setCountdownDisplay] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [timerForm, setTimerForm] = useState({
    timer_name: '',
    target_date: '',
    target_time: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recipient_id: ''
  });
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchTimers();
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (selectedTimer) {
      calculateCountdown();
      const interval = setInterval(() => {
        calculateCountdown();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedTimer]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchTimers = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/countdown/timers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTimers(data.timers || []);
        if (data.timers && data.timers.length > 0 && !selectedTimer) {
          setSelectedTimer(data.timers[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching timers:', err);
    }
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

  const calculateCountdown = () => {
    if (!selectedTimer) {
      setCountdownDisplay('');
      return;
    }

    try {
      const now = new Date();
      const timeStr = selectedTimer.target_time || '00:00:00';
      const dateTimeStr = `${selectedTimer.target_date}T${timeStr}`;
      const targetDateStr = `${selectedTimer.target_date} ${timeStr}`;

      const nowInTZ = new Date(now.toLocaleString('en-US', { timeZone: selectedTimer.timezone }));
      const nowUTC = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzOffset = nowUTC.getTime() - nowInTZ.getTime();

      const targetLocal = new Date(targetDateStr);
      const targetUTC = new Date(targetLocal.getTime() - tzOffset);

      const diff = targetUTC.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdownDisplay('Time\'s up! 💕');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 1) {
        setCountdownDisplay(`${days} day${days !== 1 ? 's' : ''}`);
      } else if (days === 1) {
        setCountdownDisplay(`${hours} hour${hours !== 1 ? 's' : ''}`);
      } else {
        setCountdownDisplay(`${hours}h ${minutes}m ${seconds}s`);
      }
    } catch (err) {
      console.error('Error calculating countdown:', err);
      setCountdownDisplay('');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveTimer = async (e) => {
    e.preventDefault();
    if (!timerForm.target_date || !timerForm.timezone) {
      showNotification('Please fill in date and timezone!', 'error');
      return;
    }

    try {
      const token = getToken();
      const requestBody = {
        timer_name: timerForm.timer_name || 'Time Until We Meet',
        target_date: timerForm.target_date,
        target_time: timerForm.target_time || null,
        timezone: timerForm.timezone,
        recipient_id: timerForm.recipient_id || null
      };

      console.log('Sending timer creation request:', requestBody);

      const res = await fetch('/api/countdown/timers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Timer created successfully:', data);
        showNotification('✨ Timer created!', 'success');
        setShowForm(false);
        setTimerForm({
          timer_name: '',
          target_date: '',
          target_time: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          recipient_id: ''
        });
        fetchTimers();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Timer creation failed:', {
          status: res.status,
          statusText: res.statusText,
          errorData: errorData,
          requestBody: {
            timer_name: timerForm.timer_name || 'Time Until We Meet',
            target_date: timerForm.target_date,
            target_time: timerForm.target_time || null,
            timezone: timerForm.timezone,
            recipient_id: timerForm.recipient_id || null
          }
        });

        const errorMessage = errorData.message || errorData.error || 'Unknown error';
        const errorCode = errorData.code ? ` (${errorData.code})` : '';
        showNotification(`Failed to create timer: ${errorMessage}${errorCode}`, 'error');
      }
    } catch (err) {
      console.error('Error saving timer:', err);
      showNotification('Error creating timer', 'error');
    }
  };

  const handleDeleteTimer = async (timerId) => {
    if (!confirm('Are you sure you want to delete this timer?')) return;

    try {
      const token = getToken();
      const res = await fetch(`/api/countdown/timers/${timerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification('Timer deleted', 'success');
        fetchTimers();
        if (selectedTimer && selectedTimer.id === timerId) {
          setSelectedTimer(null);
          setCountdownDisplay('');
        }
      } else {
        showNotification('Failed to delete timer', 'error');
      }
    } catch (err) {
      console.error('Error deleting timer:', err);
      showNotification('Error deleting timer', 'error');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Countdown Timer ⏰</title>
      </Head>

      <div className={styles.container}>
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            {notification.message}
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>⏰ Countdown Timers</h1>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Cancel' : '+ Create Timer'}
          </button>
        </div>

        {showForm && (
          <div className={styles.formCard}>
            <h2>Create New Timer</h2>
            <form onSubmit={handleSaveTimer}>
              <label>
                Timer Name
                <input
                  type="text"
                  value={timerForm.timer_name}
                  onChange={(e) => setTimerForm({ ...timerForm, timer_name: e.target.value })}
                  placeholder="e.g., TIME TILL KISS"
                  className={styles.input}
                />
              </label>
              <label>
                Date *
                <input
                  type="date"
                  value={timerForm.target_date}
                  onChange={(e) => setTimerForm({ ...timerForm, target_date: e.target.value })}
                  required
                  className={styles.input}
                />
              </label>
              <label>
                Time (Optional)
                <input
                  type="time"
                  value={timerForm.target_time}
                  onChange={(e) => setTimerForm({ ...timerForm, target_time: e.target.value })}
                  className={styles.input}
                />
              </label>
              <label>
                Timezone *
                <select
                  value={timerForm.timezone}
                  onChange={(e) => setTimerForm({ ...timerForm, timezone: e.target.value })}
                  required
                  className={styles.input}
                >
                  {Intl.supportedValuesOf('timeZone').map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>
              <label>
                Send to User (Optional)
                <select
                  value={timerForm.recipient_id}
                  onChange={(e) => setTimerForm({ ...timerForm, recipient_id: e.target.value })}
                  className={styles.input}
                >
                  <option value="">Just for me</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className={styles.btnSend}>
                Create Timer ⏰
              </button>
            </form>
          </div>
        )}

        <div className={styles.content}>
          {timers.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⏰</div>
              <p>No timers yet. Create one to get started!</p>
            </div>
          ) : (
            <div className={styles.timersGrid}>
              {timers.map(timer => (
                <div
                  key={timer.id}
                  className={`${styles.timerCard} ${selectedTimer && selectedTimer.id === timer.id ? styles.active : ''}`}
                  onClick={() => setSelectedTimer(timer)}
                >
                  <div className={styles.timerCardHeader}>
                    <h3>{timer.timer_name}</h3>
                    {timer.sender_username && (
                      <span className={styles.senderBadge}>From: {timer.sender_username}</span>
                    )}
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTimer(timer.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.timerCardDate}>
                    {new Date(timer.target_date).toLocaleDateString()}
                    {timer.target_time && ` at ${timer.target_time}`}
                  </div>
                  <div className={styles.timerCardTimezone}>{timer.timezone}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTimer && (
          <div className={styles.countdownDisplay}>
            <div className={styles.countdownTitle}>{selectedTimer.timer_name}</div>
            <div className={styles.countdownTime}>{countdownDisplay || 'Calculating...'}</div>
            {selectedTimer.sender_username && (
              <div className={styles.countdownSender}>Shared by {selectedTimer.sender_username}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

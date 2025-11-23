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
        const fetchedTimers = data.timers || [];

        // Filter out any timers that might have enabled = false (just in case)
        const activeTimers = fetchedTimers.filter(t => t.enabled !== false);

        setTimers(activeTimers);

        // Update selected timer if it still exists, or select first one
        if (selectedTimer) {
          const stillExists = activeTimers.find(t => t.id === selectedTimer.id);
          if (stillExists) {
            // Update selected timer with fresh data
            setSelectedTimer(stillExists);
          } else {
            // Selected timer was deleted, select first available or clear
            if (activeTimers.length > 0) {
              setSelectedTimer(activeTimers[0]);
            } else {
              setSelectedTimer(null);
              setCountdownDisplay('');
            }
          }
        } else if (activeTimers.length > 0) {
          setSelectedTimer(activeTimers[0]);
        } else {
          setSelectedTimer(null);
          setCountdownDisplay('');
        }
      }
    } catch (err) {
      console.error('Error fetching timers:', err);
      showNotification('Failed to load timers', 'error');
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

      // Handle date - it might be a Date object or a string
      let targetDateStr = selectedTimer.target_date;

      console.log('Countdown calculation - raw timer data:', {
        target_date: selectedTimer.target_date,
        target_date_type: typeof selectedTimer.target_date,
        target_date_isDate: selectedTimer.target_date instanceof Date,
        target_time: selectedTimer.target_time,
        timezone: selectedTimer.timezone
      });

      if (targetDateStr instanceof Date) {
        targetDateStr = targetDateStr.toISOString().split('T')[0];
      } else if (typeof targetDateStr === 'string') {
        // If it's already in YYYY-MM-DD format, use it
        if (!targetDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Try to parse it
          const dateObj = new Date(targetDateStr);
          if (!isNaN(dateObj.getTime())) {
            targetDateStr = dateObj.toISOString().split('T')[0];
          } else {
            console.error('Failed to parse date string:', targetDateStr);
            setCountdownDisplay('Invalid date format');
            return;
          }
        }
      } else {
        console.error('Unexpected date type:', typeof targetDateStr, targetDateStr);
        setCountdownDisplay('Invalid date');
        return;
      }

      const timeStr = selectedTimer.target_time || '00:00';

      // Parse date and time components
      const dateParts = targetDateStr.split('-');
      if (dateParts.length !== 3) {
        console.error('Invalid date format:', targetDateStr);
        setCountdownDisplay('Invalid date format');
        return;
      }

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);

      const timeParts = timeStr.split(':');
      const hour = parseInt(timeParts[0]) || 0;
      const minute = parseInt(timeParts[1]) || 0;
      const second = parseInt(timeParts[2]) || 0;

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.error('Invalid date components:', { year, month, day, dateStr: targetDateStr });
        setCountdownDisplay('Invalid date');
        return;
      }

      // Build target date/time string in ISO format
      const targetDateTimeStr = `${targetDateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

      // Create date object - this creates it in local timezone
      const targetDateLocal = new Date(targetDateTimeStr);

      if (isNaN(targetDateLocal.getTime())) {
        console.error('Invalid date object:', targetDateTimeStr);
        setCountdownDisplay('Invalid date');
        return;
      }

      // Calculate timezone offset for the target timezone
      // Get current time in target timezone
      const nowInTZStr = now.toLocaleString('en-US', {
        timeZone: selectedTimer.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // Parse the formatted string to get components
      const nowInTZMatch = nowInTZStr.match(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/);
      if (!nowInTZMatch) {
        console.error('Failed to parse timezone string:', nowInTZStr);
        setCountdownDisplay('Error calculating');
        return;
      }

      const [, tzMonth, tzDay, tzYear, tzHour, tzMinute, tzSecond] = nowInTZMatch.map(Number);
      const nowInTZDate = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);

      // Calculate offset
      const offset = now.getTime() - nowInTZDate.getTime();

      // Create target date in target timezone (treat as local)
      const targetInTZDate = new Date(year, month - 1, day, hour, minute, second);

      // Convert to UTC by adding the offset
      const targetUTC = new Date(targetInTZDate.getTime() + offset);

      // Calculate difference
      const diff = targetUTC.getTime() - now.getTime();

      if (isNaN(diff)) {
        console.error('NaN in diff calculation:', {
          targetDate: targetDateStr,
          targetTime: timeStr,
          timezone: selectedTimer.timezone,
          targetInTZDate: targetInTZDate.toString(),
          targetUTC: targetUTC.toString(),
          now: now.toString(),
          offset
        });
        setCountdownDisplay('Error calculating');
        return;
      }

      if (diff <= 0) {
        setCountdownDisplay('Time\'s up! 💕');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (isNaN(days) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        console.error('NaN in time calculation:', { days, hours, minutes, seconds, diff });
        setCountdownDisplay('Error calculating');
        return;
      }

      if (days > 1) {
        setCountdownDisplay(`${days} day${days !== 1 ? 's' : ''}`);
      } else if (days === 1) {
        setCountdownDisplay(`${hours} hour${hours !== 1 ? 's' : ''}`);
      } else {
        setCountdownDisplay(`${hours}h ${minutes}m ${seconds}s`);
      }
    } catch (err) {
      console.error('Error calculating countdown:', err, {
        timer: selectedTimer
      });
      setCountdownDisplay('Error calculating');
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
        if (data.shared) {
          showNotification('✨ Timer shared with both users!', 'success');
        } else {
          showNotification('✨ Timer created!', 'success');
        }
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
        // Immediately remove timer from local state
        const updatedTimers = timers.filter(timer => timer.id !== timerId);
        setTimers(updatedTimers);

        // If the deleted timer was selected, clear selection
        if (selectedTimer && selectedTimer.id === timerId) {
          setSelectedTimer(null);
          setCountdownDisplay('');
          // If there are other timers, select the first one
          if (updatedTimers.length > 0) {
            setSelectedTimer(updatedTimers[0]);
          }
        }

        showNotification('Timer deleted', 'success');

        // Refresh from server to ensure consistency (this will update selectedTimer if needed)
        setTimeout(async () => {
          await fetchTimers();
        }, 100);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete failed:', errorData);
        showNotification(`Failed to delete timer: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error deleting timer:', err);
      showNotification(`Error deleting timer: ${err.message}`, 'error');
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
                    {timer.is_shared && (
                      <span className={styles.sharedBadge}>
                        {timer.is_received ? `Shared by ${timer.sender_username}` : `Shared with ${timer.shared_with_username || 'you'}`}
                      </span>
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
                    {(() => {
                      // Parse date string manually to avoid timezone issues
                      const dateStr = timer.target_date;
                      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString();
                      }
                      // Fallback for other formats
                      return new Date(dateStr).toLocaleDateString();
                    })()}
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
            {selectedTimer.is_shared && (
              <div className={styles.countdownSender}>
                {selectedTimer.is_received
                  ? `Shared by ${selectedTimer.sender_username}`
                  : `Shared with ${selectedTimer.shared_with_username || 'you'}`}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/mailbox.module.css';

export default function Mailbox({ user }) {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mailboxDesign, setMailboxDesign] = useState(null);
  const [notification, setNotification] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingContent, setReplyingContent] = useState('');
  const [sending, setSending] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(null);
  const [countdownDisplay, setCountdownDisplay] = useState('');
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [timerForm, setTimerForm] = useState({
    timer_name: '',
    target_date: '',
    target_time: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    show_large: false
  });
  const router = useRouter();
  const notificationTimeoutRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchThreads();
    loadMailboxDesign();
    loadCountdownTimer();
    startMessageChecking();
    startCountdownUpdate();
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (selectedThread) {
      fetchThreadMessages(selectedThread.other_user_id);
      setShouldAutoScroll(true); // Reset when thread changes
    }
  }, [selectedThread]);

  useEffect(() => {
    // Only auto-scroll if user hasn't scrolled up
    if (selectedThread && shouldAutoScroll && threadMessages.length > 0) {
      scrollToBottom();
    }
  }, [threadMessages, selectedThread, shouldAutoScroll]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;

    const element = chatMessagesRef.current;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;

    // Only auto-scroll if user is near the bottom
    setShouldAutoScroll(isNearBottom);
  };

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchThreads = async () => {
    try {
      const token = getToken();
      const [threadsRes, unreadRes, usersRes] = await Promise.all([
        fetch('/api/mailbox/threads', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mailbox/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mailbox/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (threadsRes.ok) {
        const data = await threadsRes.json();
        setThreads(data.threads || []);
      }

      if (unreadRes.ok) {
        const data = await unreadRes.json();
        setUnreadCount(data.count || 0);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (otherUserId) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/mailbox/thread?other_user_id=${otherUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching thread messages:', err);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadMailboxDesign = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/mailbox/upload', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.design) {
          setMailboxDesign(data.design.image_url || data.design.image_data);
        }
      }
    } catch (err) {
      console.error('Error loading mailbox design:', err);
    }
  };

  const loadCountdownTimer = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/countdown/timer', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.timer) {
          setCountdownTimer(data.timer);
          if (data.timer.timer_name) {
            setTimerForm(prev => ({ ...prev, timer_name: data.timer.timer_name }));
          }
          if (data.timer.show_large !== undefined) {
            setTimerForm(prev => ({ ...prev, show_large: data.timer.show_large }));
          }
        }
      }
    } catch (err) {
      console.error('Error loading countdown timer:', err);
    }
  };

  const calculateCountdown = () => {
    if (!countdownTimer) {
      setCountdownDisplay('');
      return;
    }

    try {
      // Get current time
      const now = new Date();

      // Create target date/time string in the target timezone
      const timeStr = countdownTimer.target_time || '00:00:00';
      const dateTimeStr = `${countdownTimer.target_date}T${timeStr}`;

      // Create date assuming it's in the target timezone
      // We'll use a workaround: create date string and parse it
      const targetDateStr = `${countdownTimer.target_date} ${timeStr}`;

      // Get current time in target timezone
      const nowInTZ = new Date(now.toLocaleString('en-US', { timeZone: countdownTimer.timezone }));
      const nowUTC = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzOffset = nowUTC.getTime() - nowInTZ.getTime();

      // Create target date (treat as local first)
      const targetLocal = new Date(targetDateStr);
      // Adjust to UTC by subtracting timezone offset
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

  const startCountdownUpdate = () => {
    calculateCountdown();
    const interval = setInterval(() => {
      calculateCountdown();
    }, 1000);
    return () => clearInterval(interval);
  };

  const handleSaveTimer = async (e) => {
    e.preventDefault();
    if (!timerForm.target_date || !timerForm.timezone) {
      showNotification('Please fill in date and timezone!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/countdown/timer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timer_name: timerForm.timer_name || 'Time Until We Meet',
          target_date: timerForm.target_date,
          target_time: timerForm.target_time || null,
          timezone: timerForm.timezone,
          show_large: timerForm.show_large,
          enabled: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCountdownTimer(data.timer);
        setShowTimerSettings(false);
        showNotification('✨ Countdown timer saved!', 'success');
        calculateCountdown();
      } else {
        showNotification('Failed to save timer', 'error');
      }
    } catch (err) {
      console.error('Error saving timer:', err);
      showNotification('Error saving timer', 'error');
    }
  };

  const startMessageChecking = () => {
    checkIntervalRef.current = setInterval(async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/mailbox/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const newCount = data.count || 0;

          if (newCount > unreadCount && unreadCount > 0) {
            showNotification('💌 New message received!', 'success');
            fetchThreads();
            if (selectedThread) {
              fetchThreadMessages(selectedThread.other_user_id);
            }
          }
          setUnreadCount(newCount);
        }
      } catch (err) {
        console.error('Error checking messages:', err);
      }
    }, 10000);
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyingContent.trim() || !selectedThread) return;

    await sendMessage(replyingContent.trim());
  };

  const sendMessage = async (content) => {
    if (!content.trim() || !selectedThread) return;

    setSending(true);
    try {
      const token = getToken();
      const res = await fetch('/api/mailbox/thread', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: selectedThread.other_user_id,
          content: content.trim()
        })
      });

      if (res.ok) {
        setReplyingContent('');
        setShouldAutoScroll(true); // Enable auto-scroll when sending
        fetchThreadMessages(selectedThread.other_user_id);
        fetchThreads();
      } else {
        showNotification('Failed to send message', 'error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showNotification('Error sending message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handlePresetMessage = (message, emoji) => {
    const fullMessage = `${message} ${emoji}`;
    sendMessage(fullMessage);
  };

  const handleStartNewThread = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const recipientId = parseInt(formData.get('recipient'));
    const content = formData.get('content').trim();

    if (!content) {
      showNotification('Please enter a message!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/mailbox/thread', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          content: content
        })
      });

      if (res.ok) {
        showNotification('💕 Message sent!', 'success');
        e.target.reset();
        fetchThreads();
        // Open the new thread
        const recipient = users.find(u => u.id === recipientId);
        if (recipient) {
          setSelectedThread({
            other_user_id: recipientId,
            other_username: recipient.username
          });
        }
      } else {
        showNotification('Failed to send message', 'error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showNotification('Error sending message', 'error');
    }
  };

  if (!user || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your mailbox... 💌</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Our Mailbox 💌</title>
      </Head>

      <div className={styles.container}>
        {/* Bobbing Hearts Background */}
        <div className={styles.heartsBackground}>
          {[...Array(30)].map((_, i) => {
            // Create a grid pattern for hearts
            const row = Math.floor(i / 6);
            const col = i % 6;
            const left = 10 + (col * 15) + (Math.random() * 5);
            const top = 10 + (row * 15) + (Math.random() * 5);

            return (
              <span
                key={i}
                className={styles.heart}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 1.5}s`
                }}
              >
                {['💕', '💖', '💗', '💓', '💝', '❤️', '💛', '💚'][Math.floor(Math.random() * 8)]}
              </span>
            );
          })}
        </div>

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

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>💌 Our Mailbox</h1>
          <p className={styles.subtitle}>Leave sweet messages for each other</p>

          {unreadCount > 0 && (
            <div className={styles.unreadBadge}>
              {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          {selectedThread && (
            <button
              className={styles.btnSecondary}
              onClick={() => {
                setSelectedThread(null);
                setThreadMessages([]);
              }}
            >
              ← Back to Threads
            </button>
          )}
        </div>

        {/* Thread List View */}
        {!selectedThread && (
          <div className={styles.mailboxContainer}>
            <div
              className={styles.mailbox}
              style={{
                backgroundImage: mailboxDesign
                  ? `url(${mailboxDesign})`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className={styles.mailboxContent}>
                {threads.length === 0 ? (
                  <div className={styles.emptyMailbox}>
                    <div className={styles.emptyIcon}>📭</div>
                    <p>No conversations yet. Start by sending a sweet message! 💕</p>
                    <form onSubmit={handleStartNewThread} style={{ marginTop: '20px', maxWidth: '400px' }}>
                      <select name="recipient" required className={styles.select}>
                        <option value="">Select recipient...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                      </select>
                      <textarea
                        name="content"
                        placeholder="Type your sweet message here..."
                        required
                        className={styles.textarea}
                        rows="3"
                      />
                      <button type="submit" className={styles.btnSend}>
                        Send 💌
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className={styles.threadsList}>
                    {threads.map(thread => (
                      <div
                        key={thread.other_user_id}
                        className={`${styles.threadCard} ${thread.unread_count > 0 ? styles.unread : ''}`}
                        onClick={() => setSelectedThread(thread)}
                      >
                        <div className={styles.threadHeader}>
                          <span className={styles.threadUsername}>{thread.other_username}</span>
                          {thread.unread_count > 0 && (
                            <span className={styles.newBadge}>{thread.unread_count}</span>
                          )}
                          <span className={styles.threadTime}>
                            {new Date(thread.last_message_time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={styles.threadPreview}>
                          {thread.last_message.length > 50
                            ? thread.last_message.substring(0, 50) + '...'
                            : thread.last_message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Thread Chat View */}
        {selectedThread && (
          <div className={styles.mailboxContainer}>
            {/* Large Countdown Display */}
            {countdownTimer && countdownTimer.show_large && countdownDisplay && (
              <div className={styles.largeCountdown}>
                <div className={styles.largeCountdownTitle}>{countdownTimer.timer_name}</div>
                <div className={styles.largeCountdownTime}>{countdownDisplay}</div>
              </div>
            )}

            <div
              className={styles.mailbox}
              style={{
                backgroundImage: mailboxDesign
                  ? `url(${mailboxDesign})`
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className={styles.chatWrapper}>
                <div className={styles.chatContainer}>
                  <div className={styles.chatHeader}>
                    <div className={styles.chatHeaderLeft}>
                      <h3>💬 {selectedThread.other_username}</h3>
                      {countdownTimer && countdownDisplay && (
                        <div className={styles.headerCountdown}>
                          <span className={styles.headerCountdownName}>{countdownTimer.timer_name}:</span>
                          <span className={styles.headerCountdownTime}>{countdownDisplay}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.chatHeaderButtons}>
                      <button
                        className={styles.timerToggle}
                        onClick={() => setShowTimerSettings(!showTimerSettings)}
                        title="Timer settings"
                      >
                        ⏰
                      </button>
                      <button
                        className={styles.sidebarToggle}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? 'Close quick messages' : 'Open quick messages'}
                      >
                        {sidebarOpen ? '✕' : '💌'}
                      </button>
                    </div>
                  </div>
                <div
                  className={styles.chatMessages}
                  ref={chatMessagesRef}
                  onScroll={handleScroll}
                >
                  {threadMessages.length === 0 ? (
                    <div className={styles.emptyChat}>
                      <p>No messages yet. Start the conversation! 💕</p>
                    </div>
                  ) : (
                    threadMessages.map((msg, index) => {
                      // Check if we need to show a date separator
                      const currentDate = new Date(msg.created_at).toDateString();
                      const prevDate = index > 0
                        ? new Date(threadMessages[index - 1].created_at).toDateString()
                        : null;
                      const showDateSeparator = index === 0 || (prevDate && currentDate !== prevDate);

                      return (
                        <div key={msg.id}>
                          {showDateSeparator && (
                            <div className={styles.dateSeparator}>
                              <span>{new Date(msg.created_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}</span>
                            </div>
                          )}
                          <div
                            className={`${styles.chatMessage} ${msg.is_sent ? styles.sent : styles.received}`}
                          >
                            <div className={styles.chatBubble}>
                              <div className={styles.chatContent}>{msg.content}</div>
                              {msg.image_url && (
                                <img
                                  src={msg.image_url}
                                  alt="Message attachment"
                                  className={styles.messageImage}
                                />
                              )}
                              <div className={styles.chatFooter}>
                                <div className={styles.chatTime}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {msg.is_sent && (
                                  <div className={styles.readReceipt}>
                                    {msg.read ? '✓✓' : '✓'}
                                    {msg.read && <span className={styles.readLabel}>Read</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                  <form onSubmit={handleSendMessage} className={styles.chatInput}>
                    <textarea
                      value={replyingContent}
                      onChange={(e) => setReplyingContent(e.target.value)}
                      placeholder="Type your message..."
                      className={styles.chatTextarea}
                      rows="2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (replyingContent.trim() && !sending) {
                            handleSendMessage(e);
                          }
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className={styles.btnSend}
                      disabled={!replyingContent.trim() || sending}
                    >
                      {sending ? 'Sending...' : 'Send 💌'}
                    </button>
                  </form>
                </div>

                {/* Timer Settings Panel */}
                {showTimerSettings && (
                  <div className={styles.timerSidebar}>
                    <h4 className={styles.presetTitle}>Countdown Timer ⏰</h4>
                    {countdownTimer && countdownDisplay && (
                      <div className={styles.countdownPreview}>
                        <div className={styles.countdownName}>{countdownTimer.timer_name}</div>
                        <div className={styles.countdownTime}>{countdownDisplay}</div>
                      </div>
                    )}
                    <form onSubmit={handleSaveTimer} className={styles.timerForm}>
                      <label>
                        Timer Name
                        <input
                          type="text"
                          value={timerForm.timer_name}
                          onChange={(e) => setTimerForm({ ...timerForm, timer_name: e.target.value })}
                          placeholder="e.g., TIME TILL KISS"
                          className={styles.timerInput}
                        />
                      </label>
                      <label>
                        Date *
                        <input
                          type="date"
                          value={timerForm.target_date}
                          onChange={(e) => setTimerForm({ ...timerForm, target_date: e.target.value })}
                          required
                          className={styles.timerInput}
                        />
                      </label>
                      <label>
                        Time (Optional)
                        <input
                          type="time"
                          value={timerForm.target_time}
                          onChange={(e) => setTimerForm({ ...timerForm, target_time: e.target.value })}
                          className={styles.timerInput}
                        />
                      </label>
                      <label>
                        Timezone *
                        <select
                          value={timerForm.timezone}
                          onChange={(e) => setTimerForm({ ...timerForm, timezone: e.target.value })}
                          required
                          className={styles.timerInput}
                        >
                          {Intl.supportedValuesOf('timeZone').map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={timerForm.show_large}
                          onChange={(e) => setTimerForm({ ...timerForm, show_large: e.target.checked })}
                        />
                        Show large timer above chatbox
                      </label>
                      <button type="submit" className={styles.btnSend}>
                        Save Timer ⏰
                      </button>
                      {countdownTimer && (
                        <button
                          type="button"
                          className={styles.btnCancel}
                          onClick={async () => {
                            try {
                              const token = getToken();
                              await fetch('/api/countdown/timer', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ ...countdownTimer, enabled: false })
                              });
                              setCountdownTimer(null);
                              setCountdownDisplay('');
                              setShowTimerSettings(false);
                              showNotification('Timer disabled', 'success');
                            } catch (err) {
                              console.error('Error disabling timer:', err);
                            }
                          }}
                        >
                          Disable Timer
                        </button>
                      )}
                    </form>
                  </div>
                )}

                {/* Preset Messages Sidebar */}
                {sidebarOpen && (
                  <div className={styles.presetSidebar}>
                    <h4 className={styles.presetTitle}>Quick Messages 💌</h4>
                    {countdownTimer && countdownDisplay && (
                      <div className={styles.countdownMini}>
                        <div className={styles.countdownMiniName}>{countdownTimer.timer_name}</div>
                        <div className={styles.countdownMiniTime}>{countdownDisplay}</div>
                      </div>
                    )}
                    <div className={styles.presetButtons}>
                      <button
                        className={styles.presetBtn}
                        onClick={() => handlePresetMessage('I LOVE YOU', '💕')}
                        disabled={sending}
                      >
                        I LOVE YOU 💕
                      </button>
                      <button
                        className={styles.presetBtn}
                        onClick={() => handlePresetMessage('I MISS YOU', '💔')}
                        disabled={sending}
                      >
                        I MISS YOU 💔
                      </button>
                      <button
                        className={styles.presetBtn}
                        onClick={() => handlePresetMessage("I'M HUNGRY", '🍕')}
                        disabled={sending}
                      >
                        I'M HUNGRY 🍕
                      </button>
                      <button
                        className={styles.presetBtn}
                        onClick={() => handlePresetMessage('GOOD MORNING', '☀️')}
                        disabled={sending}
                      >
                        GOOD MORNING ☀️
                      </button>
                      <button
                        className={styles.presetBtn}
                        onClick={() => handlePresetMessage('GOOD NIGHT', '🌙')}
                        disabled={sending}
                      >
                        GOOD NIGHT 🌙
                      </button>
                      <button
                        className={styles.presetBtn}
                        onClick={() => handlePresetMessage('THINKING OF YOU', '💭')}
                        disabled={sending}
                      >
                        THINKING OF YOU 💭
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

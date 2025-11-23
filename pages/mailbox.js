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
  const [loveNotes, setLoveNotes] = useState([]);
  const [showLoveNoteModal, setShowLoveNoteModal] = useState(false);
  const [loveNoteForm, setLoveNoteForm] = useState({
    receiverId: '',
    content: '',
    bgColor: '#FFF7D1'
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
    loadUnseenLoveNotes();
    startMessageChecking();
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
          {!selectedThread && (
            <button
              className={styles.btnPrimary}
              onClick={() => setShowLoveNoteModal(true)}
            >
              Leave a Love Note ❤️
            </button>
          )}
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

        {/* Love Notes Display */}
        {loveNotes.length > 0 && (
          <div className={styles.loveNotesContainer}>
            {loveNotes.map((note, index) => {
              const tilt = (Math.random() * 4 - 2).toFixed(1);
              return (
                <div
                  key={note.id}
                  className={styles.loveNote}
                  style={{
                    backgroundColor: note.bg_color,
                    '--tilt': `${tilt}deg`,
                    zIndex: 1000 + index
                  }}
                >
                  <div className={styles.noteTape}></div>
                  <button
                    className={styles.noteClose}
                    onClick={() => handleDismissNote(note.id)}
                  >
                    ×
                  </button>
                  <div className={styles.noteContent}>{note.content}</div>
                  {note.sender_username && (
                    <div className={styles.noteSender}>— {note.sender_username}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Love Note Creation Modal */}
        {showLoveNoteModal && (
          <div className={styles.modalOverlay} onClick={() => setShowLoveNoteModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2>Leave a Love Note ❤️</h2>
              <form onSubmit={handleCreateLoveNote}>
                <label>
                  Send to
                  <select
                    value={loveNoteForm.receiverId}
                    onChange={(e) => setLoveNoteForm({ ...loveNoteForm, receiverId: e.target.value })}
                    required
                    className={styles.select}
                  >
                    <option value="">Select recipient...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Message *
                  <textarea
                    value={loveNoteForm.content}
                    onChange={(e) => setLoveNoteForm({ ...loveNoteForm, content: e.target.value })}
                    placeholder="Write your love note here..."
                    required
                    className={styles.textarea}
                    rows="4"
                  />
                </label>
                <label>
                  Background Color
                  <div className={styles.colorPicker}>
                    {['#FFF7D1', '#FFE4E1', '#E6E6FA', '#F0E68C', '#FFB6C1', '#DDA0DD', '#98FB98', '#B0E0E6'].map(color => (
                      <button
                        key={color}
                        type="button"
                        className={styles.colorOption}
                        style={{ backgroundColor: color }}
                        onClick={() => setLoveNoteForm({ ...loveNoteForm, bgColor: color })}
                        title={color}
                      >
                        {loveNoteForm.bgColor === color && '✓'}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={loveNoteForm.bgColor}
                      onChange={(e) => setLoveNoteForm({ ...loveNoteForm, bgColor: e.target.value })}
                      className={styles.colorInput}
                    />
                  </div>
                </label>
                <div className={styles.modalActions}>
                  <button type="submit" className={styles.btnSend}>
                    Send Love Note 💕
                  </button>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={() => setShowLoveNoteModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                    <h3>💬 {selectedThread.other_username}</h3>
                    <div className={styles.chatHeaderButtons}>
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

                {/* Preset Messages Sidebar */}
                {sidebarOpen && (
                  <div className={styles.presetSidebar}>
                    <h4 className={styles.presetTitle}>Quick Messages 💌</h4>
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

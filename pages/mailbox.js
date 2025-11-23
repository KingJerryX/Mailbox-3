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
  const [showUpload, setShowUpload] = useState(false);
  const [notification, setNotification] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingContent, setReplyingContent] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const notificationTimeoutRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchThreads();
    loadMailboxDesign();
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
      // Auto-scroll to bottom when new messages arrive
      scrollToBottom();
    }
  }, [selectedThread, threadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleUploadDesign = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const isJPG = file.type === 'image/jpeg' ||
                  file.type === 'image/jpg' ||
                  file.name.toLowerCase().endsWith('.jpg') ||
                  file.name.toLowerCase().endsWith('.jpeg');

    if (!isJPG) {
      showNotification('⚠️ Only JPG files are allowed for mailbox design!', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const token = getToken();
        const base64data = reader.result.split(',')[1];

        const res = await fetch('/api/mailbox/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image_data: base64data,
            image_url: reader.result
          })
        });

        if (res.ok) {
          const data = await res.json();
          setMailboxDesign(data.design.image_url || data.design.image_data);
          setShowUpload(false);
          showNotification('✨ Mailbox design updated!', 'success');
        } else {
          showNotification('Failed to upload design', 'error');
        }
      } catch (err) {
        console.error('Error uploading:', err);
        showNotification('Error uploading design', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyingContent.trim() || !selectedThread) return;

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
          content: replyingContent.trim()
        })
      });

      if (res.ok) {
        setReplyingContent('');
        fetchThreadMessages(selectedThread.other_user_id);
        fetchThreads();
        scrollToBottom();
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
              onClick={() => setShowUpload(!showUpload)}
            >
              🎨 Upload Mailbox Design
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

        {/* Upload Design Section */}
        {showUpload && !selectedThread && (
          <div className={styles.uploadSection}>
            <h3>Choose a cute mailbox design</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
              ⚠️ Only JPG files are allowed
            </p>
            <input
              type="file"
              accept="image/jpeg,.jpg"
              onChange={handleUploadDesign}
              className={styles.fileInput}
            />
            <button onClick={() => setShowUpload(false)}>Cancel</button>
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
              <div className={styles.chatContainer}>
                <div className={styles.chatHeader}>
                  <h3>💬 {selectedThread.other_username}</h3>
                </div>
                <div className={styles.chatMessages}>
                  {threadMessages.length === 0 ? (
                    <div className={styles.emptyChat}>
                      <p>No messages yet. Start the conversation! 💕</p>
                    </div>
                  ) : (
                    threadMessages.map(msg => (
                      <div
                        key={msg.id}
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
                          <div className={styles.chatTime}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}

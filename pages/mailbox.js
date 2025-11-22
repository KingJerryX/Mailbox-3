import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/mailbox.module.css';

export default function Mailbox({ user }) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mailboxDesign, setMailboxDesign] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [notification, setNotification] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const router = useRouter();
  const notificationTimeoutRef = useRef(null);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
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

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchData = async () => {
    try {
      const token = getToken();
      const [messagesRes, unreadRes, usersRes] = await Promise.all([
        fetch('/api/mailbox/messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mailbox/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mailbox/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data.messages || []);
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
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
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
    // Check for new messages every 10 seconds
    checkIntervalRef.current = setInterval(async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/mailbox/unread', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const newCount = data.count || 0;

          setUnreadCount(prevCount => {
            if (newCount > prevCount && prevCount > 0) {
              // New message received!
              showNotification('💌 New message received!', 'success');
              fetchData(); // Refresh messages
            }
            return newCount;
          });
        }
      } catch (err) {
        console.error('Error checking messages:', err);
      }
    }, 10000);
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

  const handleUploadDesign = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is JPG
    const isJPG = file.type === 'image/jpeg' ||
                  file.type === 'image/jpg' ||
                  file.name.toLowerCase().endsWith('.jpg') ||
                  file.name.toLowerCase().endsWith('.jpeg');

    if (!isJPG) {
      showNotification('⚠️ Only JPG files are allowed for mailbox design!', 'error');
      event.target.value = ''; // Clear the input
      return;
    }

    // Convert to base64
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
    const formData = new FormData(e.target);
    const recipientId = replyingTo ? replyingTo.sender_id : parseInt(formData.get('recipient'));
    let content = formData.get('content').trim();

    if (!content) {
      showNotification('Please enter a message!', 'error');
      return;
    }

    // If replying, prepend "Re: " and the original message
    if (replyingTo) {
      content = `Re: "${replyingTo.content.substring(0, 50)}${replyingTo.content.length > 50 ? '...' : ''}"\n\n${content}`;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/mailbox/messages', {
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
        setShowCompose(false);
        setReplyingTo(null);
        fetchData();
      } else {
        showNotification('Failed to send message', 'error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      showNotification('Error sending message', 'error');
    }
  };

  const handleReply = (message) => {
    // Set the recipient to the sender of the message
    setReplyingTo(message);
    setShowCompose(true);
  };

  const handleMarkAsRead = async (messageId) => {
    try {
      const token = getToken();
      const res = await fetch('/api/mailbox/messages', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_id: messageId })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error marking as read:', err);
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
        {/* Cute Notification Popup */}
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
          <button
            className={styles.btnPrimary}
            onClick={() => setShowCompose(!showCompose)}
          >
            ✉️ Write a Message
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => setShowUpload(!showUpload)}
          >
            🎨 Upload Mailbox Design
          </button>
        </div>

        {/* Upload Design Section */}
        {showUpload && (
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

        {/* Compose Message Section */}
        {showCompose && (
          <div className={styles.composeSection}>
            <h3>{replyingTo ? '💬 Reply to Message' : '💕 Write a Message'}</h3>
            <form onSubmit={handleSendMessage}>
              {replyingTo ? (
                <div style={{
                  backgroundColor: '#f0f0f0',
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    Replying to: <strong>{replyingTo.sender_username}</strong>
                  </p>
                  <input type="hidden" name="recipient" value={replyingTo.sender_id} />
                </div>
              ) : (
                <select name="recipient" required className={styles.select}>
                  <option value="">Select recipient...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              )}
              <textarea
                name="content"
                placeholder={replyingTo ? "Type your reply here..." : "Type your sweet message here..."}
                required
                className={styles.textarea}
                rows="5"
              />
              <button type="submit" className={styles.btnSend}>
                {replyingTo ? 'Send Reply 💌' : 'Send 💌'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompose(false);
                  setReplyingTo(null);
                }}
                className={styles.btnCancel}
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Mailbox Display */}
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
              {messages.length === 0 ? (
                <div className={styles.emptyMailbox}>
                  <div className={styles.emptyIcon}>📭</div>
                  <p>No messages yet. Start by sending a sweet message! 💕</p>
                </div>
              ) : (
                <div className={styles.messagesList}>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`${styles.messageCard} ${!msg.read ? styles.unread : ''}`}
                      onClick={() => !msg.read && handleMarkAsRead(msg.id)}
                    >
                      <div className={styles.messageHeader}>
                        <span className={styles.messageFrom}>
                          From: {msg.sender_username || 'Someone'}
                        </span>
                        {!msg.read && <span className={styles.newBadge}>NEW</span>}
                        <span className={styles.messageDate}>
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={styles.messageContent}>{msg.content}</div>
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Message attachment"
                          className={styles.messageImage}
                        />
                      )}
                      {msg.recipient_id === user.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReply(msg);
                          }}
                          style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          💬 Reply
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

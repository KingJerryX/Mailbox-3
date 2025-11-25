import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/love-log.module.css';

export default function LoveLog({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [friendRequests, setFriendRequests] = useState([]);
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [notification, setNotification] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPosts();
    fetchFriendRequests();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchPosts = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/love-log/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/love-log/friend-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading friend requests:', err);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      showNotification('Please fill in both title and content!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/love-log/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newPost.title.trim(),
          content: newPost.content.trim()
        })
      });

      if (res.ok) {
        showNotification('✨ Post published!', 'success');
        setNewPost({ title: '', content: '' });
        setShowNewPost(false);
        fetchPosts();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to publish post', 'error');
      }
    } catch (err) {
      console.error('Error publishing post:', err);
      showNotification('Error publishing post', 'error');
    }
  };

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    if (!friendUsername.trim()) {
      showNotification('Please enter a username!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/love-log/friend-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: friendUsername.trim()
        })
      });

      if (res.ok) {
        showNotification('💌 Friend request sent!', 'success');
        setFriendUsername('');
        setShowFriendRequest(false);
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to send friend request', 'error');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      showNotification('Error sending friend request', 'error');
    }
  };

  const handleFriendRequestAction = async (requestId, action) => {
    try {
      const token = getToken();
      const res = await fetch('/api/love-log/friend-requests', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          action
        })
      });

      if (res.ok) {
        showNotification(
          action === 'accept' ? '✅ Friend request accepted!' : '❌ Friend request rejected',
          'success'
        );
        fetchFriendRequests();
        if (action === 'accept') {
          fetchPosts();
        }
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to process friend request', 'error');
      }
    } catch (err) {
      console.error('Error processing friend request:', err);
      showNotification('Error processing friend request', 'error');
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading Love Log...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Love Log 💕 - FerryMail</title>
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
          <h1 className={styles.title}>💕 Love Log</h1>
          <p className={styles.subtitle}>Share your thoughts with friends</p>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowNewPost(!showNewPost)}
          >
            {showNewPost ? '✕ Cancel' : '📝 New Post'}
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => setShowFriendRequest(!showFriendRequest)}
          >
            {showFriendRequest ? '✕ Cancel' : '👥 Add Friend'}
          </button>
          {friendRequests.length > 0 && (
            <div className={styles.friendRequestsBadge}>
              {friendRequests.length} pending
            </div>
          )}
        </div>

        {/* Friend Requests Panel */}
        {showFriendRequest && (
          <div className={styles.panel}>
            <h3>👥 Add Friend</h3>
            <form onSubmit={handleSendFriendRequest}>
              <input
                type="text"
                placeholder="Enter username"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                className={styles.input}
                required
              />
              <button type="submit" className={styles.btnSend}>
                Send Request 💌
              </button>
            </form>
          </div>
        )}

        {/* Pending Friend Requests */}
        {friendRequests.length > 0 && (
          <div className={styles.panel}>
            <h3>📬 Pending Friend Requests</h3>
            {friendRequests.map((request) => (
              <div key={request.id} className={styles.friendRequest}>
                <div className={styles.friendRequestInfo}>
                  <strong>{request.requester_username}</strong> wants to be your friend
                </div>
                <div className={styles.friendRequestActions}>
                  <button
                    className={styles.btnAccept}
                    onClick={() => handleFriendRequestAction(request.id, 'accept')}
                  >
                    ✅ Accept
                  </button>
                  <button
                    className={styles.btnReject}
                    onClick={() => handleFriendRequestAction(request.id, 'reject')}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Post Form */}
        {showNewPost && (
          <div className={styles.panel}>
            <h3>📝 Create New Post</h3>
            <form onSubmit={handlePublish}>
              <input
                type="text"
                placeholder="Post title..."
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className={styles.input}
                required
              />
              <textarea
                placeholder="Write your post here..."
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className={styles.textarea}
                rows="8"
                required
              />
              <button type="submit" className={styles.btnPublish}>
                📤 Publish
              </button>
            </form>
          </div>
        )}

        {/* Posts Feed */}
        <div className={styles.postsContainer}>
          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <p>No posts yet. Add friends to see their posts, or create your first post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className={styles.post}>
                <div className={styles.postDate}>
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className={styles.postAuthor}>
                  by <strong>{post.author_username}</strong>
                </div>
                <h2 className={styles.postTitle}>{post.title}</h2>
                <div className={styles.postContent}>{post.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

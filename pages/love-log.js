import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/love-log.module.css';

export default function LoveLog({ user }) {
  const [view, setView] = useState('home'); // 'home', 'own', 'friend'
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [notification, setNotification] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchFriendRequests();
    fetchFriends();
  }, [user]);

  useEffect(() => {
    if (view === 'own') {
      fetchPosts(user.id);
    } else if (view === 'friend' && selectedFriendId) {
      fetchPosts(selectedFriendId);
    }
  }, [view, selectedFriendId, user]);

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

  const fetchPosts = async (userId) => {
    try {
      setLoading(true);
      const token = getToken();
      const url = userId ? `/api/love-log/posts?userId=${userId}` : '/api/love-log/posts';
      const res = await fetch(url, {
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

  const fetchFriends = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/love-log/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
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
        fetchPosts(user.id);
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
          fetchFriends();
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

  const handleViewOwnPosts = () => {
    setView('own');
    setSelectedFriendId(null);
  };

  const handleViewFriendPosts = (friendId) => {
    setView('friend');
    setSelectedFriendId(friendId);
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedFriendId(null);
    setPosts([]);
  };

  if (!user) {
    return null;
  }

  // Home view - opening screen
  if (view === 'home') {
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

          {/* View Your Own Posts Button */}
          <div className={styles.homeActions}>
            <button
              className={styles.btnPrimary}
              onClick={handleViewOwnPosts}
            >
              📝 View My Posts
            </button>
          </div>

          {/* Friends List */}
          {friends.length > 0 && (
            <div className={styles.panel}>
              <h3>👥 Friends</h3>
              <div className={styles.friendsList}>
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    className={styles.friendButton}
                    onClick={() => handleViewFriendPosts(friend.id)}
                  >
                    👤 {friend.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Friend Section */}
          <div className={styles.panel}>
            <h3>👥 Add Friend</h3>
            <button
              className={styles.btnSecondary}
              onClick={() => setShowFriendRequest(!showFriendRequest)}
            >
              {showFriendRequest ? '✕ Cancel' : '➕ Add Friend'}
            </button>
            {showFriendRequest && (
              <form onSubmit={handleSendFriendRequest} style={{ marginTop: '15px' }}>
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
            )}
          </div>

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

          {friends.length === 0 && friendRequests.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <p>No friends yet. Add friends to see their posts!</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // Own posts view or friend posts view
  const isOwnPosts = view === 'own';
  const currentAuthor = isOwnPosts ? user.username : friends.find(f => f.id === selectedFriendId)?.username || 'Unknown';

  return (
    <>
      <Head>
        <title>{isOwnPosts ? 'My Posts' : `${currentAuthor}'s Posts`} - Love Log 💕</title>
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

        {/* Header with Back Button */}
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <button
              className={styles.backButton}
              onClick={handleBackToHome}
            >
              ← Back
            </button>
            <h1 className={styles.title}>
              {isOwnPosts ? '📝 My Posts' : `👤 ${currentAuthor}'s Posts`}
            </h1>
          </div>
        </div>

        {/* New Post Button (only for own posts) */}
        {isOwnPosts && (
          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={() => setShowNewPost(!showNewPost)}
            >
              {showNewPost ? '✕ Cancel' : '📝 New Post'}
            </button>
          </div>
        )}

        {/* New Post Form (only for own posts) */}
        {isOwnPosts && showNewPost && (
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
        {loading ? (
          <div className={styles.loading}>
            <p>Loading posts...</p>
          </div>
        ) : (
          <div className={styles.postsContainer}>
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <p>{isOwnPosts ? "You haven't posted anything yet. Create your first post!" : `${currentAuthor} hasn't posted anything yet.`}</p>
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
                  {!isOwnPosts && (
                    <div className={styles.postAuthor}>
                      by <strong>{post.author_username}</strong>
                    </div>
                  )}
                  <h2 className={styles.postTitle}>{post.title}</h2>
                  <div className={styles.postContent}>{post.content}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

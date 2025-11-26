import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/love-log.module.css';

export default function LoveLog({ user }) {
  const [viewingUserId, setViewingUserId] = useState(null); // null = initial screen, user.id = own log, friend.id = friend's log
  const [viewingUsername, setViewingUsername] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(11); // November
  const [currentYear, setCurrentYear] = useState(2025);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', mood: '', postDate: '' });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPost, setEditPost] = useState({ title: '', content: '', mood: '' });
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [notification, setNotification] = useState(null);
  const router = useRouter();

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchFriendRequests();
    fetchFriends();
    // Only fetch posts if viewing a log
    if (viewingUserId) {
      fetchPosts();
    }
  }, [user, viewingUserId, currentYear, currentMonth]);

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
    if (!viewingUserId) return;
    try {
      setLoading(true);
      const token = getToken();
      const url = `/api/love-log/posts?userId=${viewingUserId}&year=${currentYear}&month=${currentMonth}`;
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
    if (!newPost.mood) {
      showNotification('Please select a mood emoji!', 'error');
      return;
    }
    if (!newPost.postDate) {
      showNotification('Please select a date!', 'error');
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
          content: newPost.content.trim(),
          mood: newPost.mood,
          postDate: newPost.postDate
        })
      });

      if (res.ok) {
        showNotification('✨ Post published!', 'success');
        setNewPost({ title: '', content: '', mood: '', postDate: '' });
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

  const handleEditPost = (post) => {
    setEditingPostId(post.id);
    setEditPost({ title: post.title, content: post.content, mood: post.mood || '' });
    setShowNewPost(false);
    setSelectedPost(null);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditPost({ title: '', content: '', mood: '' });
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!editPost.title.trim() || !editPost.content.trim()) {
      showNotification('Please fill in both title and content!', 'error');
      return;
    }
    if (!editPost.mood) {
      showNotification('Please select a mood emoji!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/love-log/posts', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: editingPostId,
          title: editPost.title.trim(),
          content: editPost.content.trim(),
          mood: editPost.mood
        })
      });

      if (res.ok) {
        showNotification('✨ Post updated!', 'success');
        setEditingPostId(null);
        setEditPost({ title: '', content: '', mood: '' });
        setSelectedPost(null);
        fetchPosts();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to update post', 'error');
      }
    } catch (err) {
      console.error('Error updating post:', err);
      showNotification('Error updating post', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/love-log/posts', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postId })
      });

      if (res.ok) {
        showNotification('🗑️ Post deleted!', 'success');
        setSelectedPost(null);
        fetchPosts();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to delete post', 'error');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      showNotification('Error deleting post', 'error');
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
        body: JSON.stringify({ username: friendUsername.trim() })
      });

      if (res.ok) {
        showNotification('✨ Friend request sent!', 'success');
        setFriendUsername('');
        setShowFriendRequest(false);
        fetchFriendRequests();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to send friend request', 'error');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      showNotification('Error sending friend request', 'error');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/love-log/friend-requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification('✅ Friend request accepted!', 'success');
        fetchFriendRequests();
        fetchFriends();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to accept request', 'error');
      }
    } catch (err) {
      console.error('Error accepting request:', err);
      showNotification('Error accepting request', 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/love-log/friend-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification('Friend request rejected', 'success');
        fetchFriendRequests();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to reject request', 'error');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      showNotification('Error rejecting request', 'error');
    }
  };

  const handleRemoveFriend = async (friendId, friendUsername) => {
    if (!confirm(`Are you sure you want to remove ${friendUsername} as a friend?`)) {
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/love-log/friends', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
      });

      if (res.ok) {
        showNotification(`👋 Removed ${friendUsername} as a friend`, 'success');
        fetchFriends();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to remove friend', 'error');
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      showNotification('Error removing friend', 'error');
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getPostForDate = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return posts.find(post => {
      const postDate = new Date(post.created_at);
      const postDateStr = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;
      return postDateStr === dateStr && post.user_id === viewingUserId;
    });
  };

  const handleViewMyLog = () => {
    setViewingUserId(user.id);
    setViewingUsername(user.username);
    setCurrentMonth(11);
    setCurrentYear(2025);
  };

  const handleViewFriendLog = (friendId, friendUsername) => {
    setViewingUserId(friendId);
    setViewingUsername(friendUsername);
    setCurrentMonth(11);
    setCurrentYear(2025);
  };

  const handleBackToInitial = () => {
    setViewingUserId(null);
    setViewingUsername(null);
    setPosts([]);
    setSelectedPost(null);
    setSelectedDate(null);
    setShowNewPost(false);
    setEditingPostId(null);
  };

  const handleDayClick = (day) => {
    const post = getPostForDate(day);
    if (post) {
      setSelectedPost(post);
      setSelectedDate(day);
    } else {
      // Only allow creating posts for own log
      if (viewingUserId === user.id) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setNewPost({ ...newPost, postDate: dateStr });
        setShowNewPost(true);
        setSelectedDate(day);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return (
      <div className={styles.calendarGrid}>
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className={styles.calendarDayEmpty}></div>;
          }
          const post = getPostForDate(day);
          const moodEmoji = post?.mood === 'sad' ? '😢' : post?.mood === 'neutral' ? '😐' : post?.mood === 'happy' ? '😊' : null;

          return (
            <div
              key={idx}
              className={`${styles.calendarDay} ${post ? styles.calendarDayHasPost : ''} ${selectedDate === day ? styles.calendarDaySelected : ''}`}
              onClick={() => handleDayClick(day)}
              title={post?.title || ''}
            >
              <div className={styles.calendarDayNumber}>{day}</div>
              {moodEmoji && (
                <div className={styles.calendarDayMood}>{moodEmoji}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>💕 Love Log - FerryMail</title>
      </Head>

      <div className={styles.container}>
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            <span>{notification.message}</span>
            <button
              className={styles.notificationClose}
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>💕 Love Log</h1>
          {viewingUserId && (
            <button
              className={styles.backButton}
              onClick={handleBackToInitial}
            >
              ← Back
            </button>
          )}
        </div>

        {/* Initial Screen - View My Log or Friends */}
        {!viewingUserId && (
          <div className={styles.initialScreen}>
            <div className={styles.viewMyLogSection}>
              <button
                className={styles.viewMyLogButton}
                onClick={handleViewMyLog}
              >
                📖 View My Log
              </button>
            </div>
            <div className={styles.friendsListSection}>
              <h2>View Friends' Logs</h2>
              {friends.length > 0 ? (
                <div className={styles.friendsListInitial}>
                  {friends.map(friend => (
                    <button
                      key={friend.id}
                      className={styles.friendLogButton}
                      onClick={() => handleViewFriendLog(friend.id, friend.username)}
                    >
                      {friend.username}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.noFriendsMessage}>No friends yet. Add a friend to see their log!</p>
              )}
            </div>
            <div className={styles.friendsSection}>
              <h3>Manage Friends</h3>
              {friends.length > 0 && (
                <div className={styles.friendsList}>
                  {friends.map(friend => (
                    <div key={friend.id} className={styles.friendItem}>
                      <span>{friend.username}</span>
                      <button
                        className={styles.btnRemoveFriend}
                        onClick={() => handleRemoveFriend(friend.id, friend.username)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className={styles.btnPrimary}
                onClick={() => setShowFriendRequest(!showFriendRequest)}
              >
                {showFriendRequest ? 'Cancel' : '+ Add Friend'}
              </button>
              {showFriendRequest && (
                <form onSubmit={handleSendFriendRequest} className={styles.friendRequestForm}>
                  <input
                    type="text"
                    placeholder="Enter username..."
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    className={styles.input}
                  />
                  <button type="submit" className={styles.btnSend}>
                    Send Request
                  </button>
                </form>
              )}
            </div>
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <div className={styles.friendRequestsSection}>
                <h3>Pending Friend Requests</h3>
                {friendRequests.map(request => (
                  <div key={request.id} className={styles.friendRequest}>
                    <div className={styles.friendRequestInfo}>
                      <strong>{request.requester_username}</strong> wants to be your friend
                    </div>
                    <div className={styles.friendRequestActions}>
                      <button
                        className={styles.btnAccept}
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Accept
                      </button>
                      <button
                        className={styles.btnReject}
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar View - Only shown when viewing a log */}
        {viewingUserId && (
          <>
            <div className={styles.viewingUserHeader}>
              <h2>{viewingUserId === user.id ? 'My Log' : `${viewingUsername}'s Log`}</h2>
            </div>

            {/* Month Navigation */}
            <div className={styles.monthNavigation}>
          <button
            className={styles.monthNavButton}
            onClick={() => {
              if (currentMonth === 1) {
                setCurrentMonth(12);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
          >
            ←
          </button>
          <h2 className={styles.monthTitle}>{monthNames[currentMonth - 1]} {currentYear}</h2>
          <button
            className={styles.monthNavButton}
            onClick={() => {
              if (currentMonth === 12) {
                setCurrentMonth(1);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
          >
            →
          </button>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className={styles.loading}>
            <p>Loading calendar...</p>
          </div>
        ) : (
          renderCalendar()
        )}

        {/* New Post Form */}
        {showNewPost && !editingPostId && (
          <div className={styles.panel}>
            <h3>📝 Create Entry for {selectedDate && `${monthNames[currentMonth - 1]} ${selectedDate}, ${currentYear}`}</h3>
            <form onSubmit={handlePublish}>
              <input
                type="date"
                value={newPost.postDate}
                onChange={(e) => setNewPost({ ...newPost, postDate: e.target.value })}
                className={styles.input}
                required
                min={`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`}
                max={`${currentYear}-${String(currentMonth).padStart(2, '0')}-${getDaysInMonth(currentYear, currentMonth)}`}
              />
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
              <div className={styles.moodSelection}>
                <label className={styles.moodLabel}>Select Mood *</label>
                <div className={styles.moodButtons}>
                  <button
                    type="button"
                    className={`${styles.moodButton} ${styles.moodSad} ${newPost.mood === 'sad' ? styles.moodSelected : ''}`}
                    onClick={() => setNewPost({ ...newPost, mood: 'sad' })}
                  >
                    😢 Sad
                  </button>
                  <button
                    type="button"
                    className={`${styles.moodButton} ${styles.moodNeutral} ${newPost.mood === 'neutral' ? styles.moodSelected : ''}`}
                    onClick={() => setNewPost({ ...newPost, mood: 'neutral' })}
                  >
                    😐 Neutral
                  </button>
                  <button
                    type="button"
                    className={`${styles.moodButton} ${styles.moodHappy} ${newPost.mood === 'happy' ? styles.moodSelected : ''}`}
                    onClick={() => setNewPost({ ...newPost, mood: 'happy' })}
                  >
                    😊 Happy
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className={styles.btnPublish}>
                  📤 Publish
                </button>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => {
                    setShowNewPost(false);
                    setNewPost({ title: '', content: '', mood: '', postDate: '' });
                    setSelectedDate(null);
                  }}
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Post Form */}
        {editingPostId && (
          <div className={styles.panel}>
            <h3>✏️ Edit Post</h3>
            <form onSubmit={handleUpdatePost}>
              <input
                type="text"
                placeholder="Post title..."
                value={editPost.title}
                onChange={(e) => setEditPost({ ...editPost, title: e.target.value })}
                className={styles.input}
                required
              />
              <textarea
                placeholder="Write your post here..."
                value={editPost.content}
                onChange={(e) => setEditPost({ ...editPost, content: e.target.value })}
                className={styles.textarea}
                rows="8"
                required
              />
              <div className={styles.moodSelection}>
                <label className={styles.moodLabel}>Select Mood *</label>
                <div className={styles.moodButtons}>
                  <button
                    type="button"
                    className={`${styles.moodButton} ${styles.moodSad} ${editPost.mood === 'sad' ? styles.moodSelected : ''}`}
                    onClick={() => setEditPost({ ...editPost, mood: 'sad' })}
                  >
                    😢 Sad
                  </button>
                  <button
                    type="button"
                    className={`${styles.moodButton} ${styles.moodNeutral} ${editPost.mood === 'neutral' ? styles.moodSelected : ''}`}
                    onClick={() => setEditPost({ ...editPost, mood: 'neutral' })}
                  >
                    😐 Neutral
                  </button>
                  <button
                    type="button"
                    className={`${styles.moodButton} ${styles.moodHappy} ${editPost.mood === 'happy' ? styles.moodSelected : ''}`}
                    onClick={() => setEditPost({ ...editPost, mood: 'happy' })}
                  >
                    😊 Happy
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className={styles.btnPublish}>
                  💾 Save Changes
                </button>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={handleCancelEdit}
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Selected Post Detail View */}
        {selectedPost && !editingPostId && (
          <div className={styles.postDetail}>
            <div className={styles.postDetailHeader}>
              <h3>Post Details</h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setSelectedPost(null);
                  setSelectedDate(null);
                }}
              >
                ×
              </button>
            </div>
            <div className={styles.moodDisplayTop}>
              <span className={`${styles.moodEmoji} ${
                selectedPost.mood === 'sad' ? styles.moodSadEmoji :
                selectedPost.mood === 'neutral' ? styles.moodNeutralEmoji :
                styles.moodHappyEmoji
              }`}>
                {selectedPost.mood === 'sad' ? '😢' : selectedPost.mood === 'neutral' ? '😐' : '😊'}
              </span>
            </div>
            <h2 className={styles.postTitle}>{selectedPost.title}</h2>
            <div className={styles.postContent}>{selectedPost.content}</div>
            <div className={styles.postDate}>
              {new Date(selectedPost.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {viewingUserId === user.id && (
              <div className={styles.postDetailActions}>
                <button
                  className={styles.btnEdit}
                  onClick={() => handleEditPost(selectedPost)}
                >
                  ✏️ Edit
                </button>
                <button
                  className={styles.btnDelete}
                  onClick={() => handleDeletePost(selectedPost.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </>
  );
}

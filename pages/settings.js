import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/mailbox.module.css';

export default function Settings({ user, setUser }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const router = useRouter();

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword.length < 6) {
      showNotification('New password must be at least 6 characters!', 'error');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match!', 'error');
      setLoading(false);
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        showNotification('✅ Password changed successfully!', 'success');
        e.target.reset();
        setShowPasswordForm(false);
      } else {
        showNotification(data.error || 'Failed to change password', 'error');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      showNotification('Error changing password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch('/api/settings/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        // Clear token and redirect
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        setUser(null);
        router.push('/');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to delete account', 'error');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      showNotification('Error deleting account', 'error');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <Head>
        <title>Settings ⚙️ - FerryMail</title>
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

        <div className={styles.header}>
          <h1 className={styles.title}>⚙️ Settings</h1>
          <p className={styles.subtitle}>Manage your account</p>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Account Info */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '10px', color: '#667eea' }}>Account Information</h2>
            <p><strong>Username:</strong> {user.username}</p>
          </div>

          {/* Change Password */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#667eea' }}>Change Password</h2>
            {!showPasswordForm ? (
              <button
                className={styles.btnPrimary}
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            ) : (
              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    className={styles.textarea}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    required
                    minLength={6}
                    className={styles.textarea}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minLength={6}
                    className={styles.textarea}
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    className={styles.btnSend}
                    disabled={loading}
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                    }}
                    className={styles.btnCancel}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Delete Account */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '2px solid #ff6b6b'
          }}>
            <h2 style={{ marginBottom: '10px', color: '#ff6b6b' }}>Danger Zone</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Deleting your account will permanently remove all your messages and data.
              This action cannot be undone.
            </p>
            <button
              className={styles.btnCancel}
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none'
              }}
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '400px',
              margin: '20px'
            }}>
              <h2 style={{ color: '#ff6b6b', marginBottom: '15px' }}>
                ⚠️ Delete Account?
              </h2>
              <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
                Are you sure you want to delete your account? This will permanently delete:
              </p>
              <ul style={{ marginBottom: '20px', paddingLeft: '20px' }}>
                <li>All your messages</li>
                <li>Your FerryMail design</li>
                <li>Your account data</li>
              </ul>
              <p style={{ marginBottom: '20px', fontWeight: 'bold', color: '#ff6b6b' }}>
                This action cannot be undone!
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  style={{
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    flex: 1
                  }}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className={styles.btnCancel}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

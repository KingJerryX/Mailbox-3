import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/bucket-list.module.css';

export default function BucketList({ user, setUser }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    imageUrl: ''
  });
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchItems();
  }, [user]);

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchItems = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/bucket-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showNotification('Please enter a title!', 'error');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch('/api/bucket-list', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          imageUrl: formData.imageUrl
        })
      });

      if (res.ok) {
        showNotification('✨ Bucket list item added!', 'success');
        setShowModal(false);
        setFormData({ title: '', description: '', category: '', imageUrl: '' });
        fetchItems();
      } else {
        showNotification('Failed to add item', 'error');
      }
    } catch (err) {
      console.error('Error creating item:', err);
      showNotification('Error adding item', 'error');
    }
  };

  const handleToggleComplete = async (itemId, currentStatus) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/bucket-list/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });

      if (res.ok) {
        if (!currentStatus) {
          showNotification('🎉 Item completed!', 'success');
        }
        fetchItems();
      } else {
        showNotification('Failed to update item', 'error');
      }
    } catch (err) {
      console.error('Error updating item:', err);
      showNotification('Error updating item', 'error');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`/api/bucket-list/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification('Item deleted', 'success');
        fetchItems();
      } else {
        showNotification('Failed to delete item', 'error');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      showNotification('Error deleting item', 'error');
    }
  };

  if (!user) {
    return null;
  }

  const completedCount = items.filter(item => item.is_completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categories = ['Travel', 'Food', 'Movies', 'Dates', 'Random', 'Goals', 'Adventure', 'Home'];

  return (
    <>
      <Head>
        <title>Bucket List 💫</title>
      </Head>

      <div className={styles.container}>
        {notification && (
          <div className={`${styles.notification} ${styles[notification.type]}`}>
            {notification.message}
          </div>
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>💫 Shared Bucket List</h1>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowModal(true)}
          >
            + Add Bucket List Item
          </button>
        </div>

        {/* Progress Display */}
        {totalCount > 0 && (
          <div className={styles.progressSection}>
            <div className={styles.progressText}>
              You've completed {completedCount} of {totalCount} items
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className={styles.progressPercent}>{progressPercent}%</div>
          </div>
        )}

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <p>No bucket list items yet. Add your first one to get started!</p>
          </div>
        ) : (
          <div className={styles.itemsGrid}>
            {items.map(item => (
              <div
                key={item.id}
                className={`${styles.itemCard} ${item.is_completed ? styles.completed : ''}`}
              >
                {item.image_url && (
                  <div className={styles.itemImage}>
                    <img src={item.image_url} alt={item.title} />
                  </div>
                )}
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    {item.category && (
                      <span className={styles.categoryTag}>{item.category}</span>
                    )}
                  </div>
                  {item.description && (
                    <p className={styles.itemDescription}>{item.description}</p>
                  )}
                  <div className={styles.itemFooter}>
                    <div className={styles.itemMeta}>
                      <span className={styles.createdBy}>
                        Added by {item.created_by_username || 'Unknown'}
                      </span>
                      {item.is_completed && item.completed_at && (
                        <span className={styles.completedDate}>
                          Completed {new Date(item.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        className={`${styles.completeBtn} ${item.is_completed ? styles.completedBtn : ''}`}
                        onClick={() => handleToggleComplete(item.id, item.is_completed)}
                      >
                        {item.is_completed ? '✓ Completed' : 'Mark Complete'}
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Item Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2>Add Bucket List Item</h2>
              <form onSubmit={handleSubmit}>
                <label>
                  Title *
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className={styles.input}
                    placeholder="e.g., Watch the Northern Lights together"
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={styles.textarea}
                    rows="3"
                    placeholder="Optional description..."
                  />
                </label>
                <label>
                  Category
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={styles.select}
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Image URL (optional)
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className={styles.input}
                    placeholder="https://example.com/image.jpg"
                  />
                </label>
                <div className={styles.modalActions}>
                  <button type="submit" className={styles.btnSend}>
                    Add Item ✨
                  </button>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

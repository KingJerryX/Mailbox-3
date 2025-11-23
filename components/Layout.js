import Link from 'next/link';
import styles from './Layout.module.css';

export default function Layout({ children, user, logout }) {
  // Debug logging
  if (typeof window !== 'undefined' && user) {
    console.log('Layout - user:', user);
    console.log('Layout - user.is_admin:', user.is_admin, typeof user.is_admin);
    console.log('Layout - user.is_admin === true:', user.is_admin === true);
    console.log('Layout - user.is_admin === "true":', user.is_admin === 'true');
    console.log('Layout - Boolean(user.is_admin):', Boolean(user.is_admin));
  }

  return (
    <div>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            🚢 FerryMail
          </Link>
          <div className={styles.navLinks}>
            {user ? (
              <>
                <Link href="/mailbox" className={styles.link}>
                  💌 Mailbox
                </Link>
                <Link href="/countdown" className={styles.link}>
                  ⏰ Countdown
                </Link>
                <Link href="/bucket-list" className={styles.link}>
                  💫 Bucket List
                </Link>
                <Link href="/games" className={styles.link}>
                  🎮 Games
                </Link>
                <Link href="/settings" className={styles.link}>
                  ⚙️ Settings
                </Link>
                {(() => {
                  // Check if user is admin - handle various formats
                  const isAdmin = user.is_admin === true ||
                                 user.is_admin === 'true' ||
                                 user.is_admin === 1 ||
                                 user.is_admin === '1' ||
                                 (typeof user.is_admin === 'string' && user.is_admin.toLowerCase() === 'true');

                  if (isAdmin) {
                    return (
                      <Link href="/admin/users" className={styles.link}>
                        🔍 Admin
                      </Link>
                    );
                  }
                  return null;
                })()}
                <Link href="/debug/admin-check" className={styles.link} style={{ fontSize: '12px', opacity: 0.7 }}>
                  🔧
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    fontSize: '12px',
                    opacity: 0.7,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    margin: 0,
                    color: 'inherit',
                    textDecoration: 'none'
                  }}
                  title="Refresh to update admin status"
                >
                  🔄
                </button>
                <span className={styles.userInfo}>
                  👤 {user.username}
                </span>
                <button onClick={logout} className={styles.logoutButton}>
                  🚪 Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.link}>
                  🔑 Login
                </Link>
                <Link href="/register" className={styles.link}>
                  ✨ Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

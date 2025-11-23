import Link from 'next/link';
import styles from './Layout.module.css';

export default function Layout({ children, user, logout }) {
  // Determine if user is admin - check all possible formats
  const isAdmin = user && (
    user.is_admin === true ||
    user.is_admin === 'true' ||
    user.is_admin === 1 ||
    user.is_admin === '1' ||
    user.is_admin === 't' ||
    (typeof user.is_admin === 'string' && user.is_admin.toLowerCase() === 'true') ||
    Boolean(user.is_admin) === true
  );

  // Debug logging (remove in production if needed)
  if (typeof window !== 'undefined' && user) {
    console.log('Layout - Admin check:', {
      isAdmin,
      'user.is_admin': user.is_admin,
      'typeof': typeof user.is_admin,
      'Boolean(user.is_admin)': Boolean(user.is_admin)
    });
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
                <Link href="/archive" className={styles.link}>
                  📦 Archive
                </Link>
                <Link href="/settings" className={styles.link}>
                  ⚙️ Settings
                </Link>
                {isAdmin && (
                  <>
                    <Link href="/admin/users" className={styles.link}>
                      🔍 Admin
                    </Link>
                    <Link href="/admin/fix" className={styles.link} style={{ fontSize: '12px', opacity: 0.7 }}>
                      🔧
                    </Link>
                  </>
                )}
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

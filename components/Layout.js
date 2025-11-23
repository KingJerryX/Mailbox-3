import Link from 'next/link';
import styles from './Layout.module.css';

export default function Layout({ children, user, logout }) {
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

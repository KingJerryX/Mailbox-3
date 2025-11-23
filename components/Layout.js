import Link from 'next/link';

export default function Layout({ children, user, logout }) {
  return (
    <div>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <Link href="/" style={styles.logo}>
            🚢 FerryMail
          </Link>
          <div style={styles.navLinks}>
            {user ? (
              <>
                <Link href="/mailbox" style={styles.link}>
                  Mailbox
                </Link>
                <Link href="/countdown" style={styles.link}>
                  Countdown
                </Link>
                <Link href="/bucket-list" style={styles.link}>
                  Bucket List
                </Link>
                <Link href="/settings" style={styles.link}>
                  Settings
                </Link>
                <span style={styles.userInfo}>
                  {user.username}
                </span>
                <button onClick={logout} style={styles.logoutButton}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" style={styles.link}>
                  Login
                </Link>
                <Link href="/register" style={styles.link}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  nav: {
    backgroundColor: '#667eea',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '15px 0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    fontWeight: '500',
  },
  userInfo: {
    fontSize: '14px',
    opacity: 0.9,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  main: {
    minHeight: 'calc(100vh - 60px)',
  },
};

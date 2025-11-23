import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const verifyUser = () => {
    // Check if user is logged in
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (token) {
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            // Ensure is_admin is always a boolean - check various formats
            let isAdmin = false;
            if (data.user.is_admin === true ||
                data.user.is_admin === 'true' ||
                data.user.is_admin === 1 ||
                data.user.is_admin === '1') {
              isAdmin = true;
            }

            const userData = {
              ...data.user,
              is_admin: isAdmin
            };
            console.log('App - Setting user with is_admin:', isAdmin, userData);
            setUser(userData);
          }
        })
        .catch(err => {
          console.error('Error verifying user:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyUser();

    // Refresh user data every 30 seconds to catch admin status changes
    const interval = setInterval(() => {
      if (document.cookie.includes('token=')) {
        verifyUser();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '24px',
        color: '#667eea'
      }}>
        Loading... 🚢
      </div>
    );
  }

  return (
    <>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </Head>
      <Layout user={user} logout={logout}>
        <Component {...pageProps} user={user} setUser={setUser} />
      </Layout>
    </>
  );
}

export default MyApp;

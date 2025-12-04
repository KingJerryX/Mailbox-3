import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home({ user }) {
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/mailbox');
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>🚢 FerryMail</h1>
      <p>Redirecting...</p>
    </div>
  );
}

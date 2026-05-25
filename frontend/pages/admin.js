// frontend/pages/admin.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the standalone admin panel (Render service or local)
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://veloztrade-admin.onrender.com';
    window.location.href = adminUrl;
  }, []);

  return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to Admin Panel...</p>
        </div>
      </div>
    </Layout>
  );
}
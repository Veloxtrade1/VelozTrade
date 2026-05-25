// frontend/components/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Layout({ children }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center flex-wrap">
          <Link href="/" className="text-2xl font-bold">
            VelozTrade
          </Link>
          <div className="space-x-4">
            <Link href="/trading" className="hover:text-accent transition">Trading</Link>
            <Link href="/platform" className="hover:text-accent transition">Platform</Link>
            <Link href="/education" className="hover:text-accent transition">Education</Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="hover:text-accent transition">Dashboard</Link>
                <button onClick={logout} className="bg-accent text-black px-3 py-1 rounded hover:bg-yellow-500 transition">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-accent transition">Login</Link>
                <Link href="/register" className="bg-accent text-black px-3 py-1 rounded hover:bg-yellow-500 transition">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-6 text-center text-sm">
        <div className="container mx-auto">
          <p className="mb-2">
            Risk warning: CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
            Between 74-89% of retail investor accounts lose money when trading CFDs. You should consider whether you understand how CFDs work
            and whether you can afford to take the high risk of losing your money.
          </p>
          <p>&copy; {new Date().getFullYear()} VelozTrade. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
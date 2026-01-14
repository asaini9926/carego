'use client'; // Switch to client component to use hooks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { 
  HomeIcon, 
  UsersIcon, 
  ChartBarIcon, 
  ArrowLeftOnRectangleIcon 
} from "@heroicons/react/24/outline";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Basic Protection Check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white fixed h-full hidden md:block">
        <div className="p-6 border-b border-gray-800">
          <span className="text-xl font-bold">Carego ERP</span>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/admin/leads" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition">
            <UsersIcon className="w-5 h-5" />
            Leads CRM
          </Link>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 w-full mt-8"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64">
        <header className="bg-white shadow-sm h-16 flex items-center px-6 justify-between">
          <h2 className="font-semibold text-gray-700">Dashboard</h2>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            A
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
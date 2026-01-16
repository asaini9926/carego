'use client'; 

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from "next/link";
import { 
  HomeIcon, 
  UsersIcon, 
  ChartBarIcon, 
  ArrowLeftOnRectangleIcon ,
  WrenchScrewdriverIcon,
  GlobeAltIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Basic Protection Check
  useEffect(() => {
    if (!mounted) return;
    
    const isLoginPage = pathname === '/admin/login';
    if (isLoginPage) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router, pathname, mounted]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/admin/login');
  };

  // Don't render layout for login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Prevent flash while checking auth
  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white fixed h-full hidden md:flex flex-col z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">C</div>
          <span className="text-xl font-bold tracking-tight">Carego Admin</span>
        </div>
        
        <nav className="p-4 space-y-1 flex-grow overflow-y-auto">
          <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ChartBarIcon className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link href="/admin/leads" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname?.startsWith('/admin/leads') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <UsersIcon className="w-5 h-5" />
            <span className="font-medium">Leads CRM</span>
          </Link>

          <Link href="/admin/services" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname?.startsWith('/admin/services') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <WrenchScrewdriverIcon className="w-5 h-5" />
            <span className="font-medium">Services</span>
          </Link>

          <Link href="/admin/cities" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname?.startsWith('/admin/cities') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <BuildingOfficeIcon className="w-5 h-5" />
            <span className="font-medium">Cities</span>
          </Link>

          <Link href="/admin/clients" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname?.startsWith('/admin/clients') ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <UsersIcon className="w-5 h-5" />
            <span className="font-medium">Clients</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full rounded-xl transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 justify-between sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 text-lg">
             {pathname === '/admin' ? 'Dashboard' : (pathname?.split('/').pop() || '').charAt(0).toUpperCase() + (pathname?.split('/').pop() || '').slice(1)}
          </h2>
          <div className="flex items-center gap-4">
            <Link href="/" target="_blank" className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1">
               <GlobeAltIcon className="w-4 h-4" /> View Site
            </Link>
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm border border-blue-200">
              A
            </div>
          </div>
        </header>
        <main className="p-8 flex-grow bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
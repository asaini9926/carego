'use client';

import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { 
  UsersIcon, 
  CurrencyRupeeIcon, 
  ClockIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    converted: 0,
    conversionRate: '0%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch leads to calculate stats locally
        // (Scalability Note: Move this logic to backend when you have >1000 leads)
        const res = await api.get('/admin/leads');
        const leads = res.data.data || [];
        
        const total = leads.length;
        const newL = leads.filter((l: any) => l.status === 'NEW').length;
        const conv = leads.filter((l: any) => l.status === 'CONVERTED').length;
        
        setStats({
          totalLeads: total,
          newLeads: newL,
          converted: conv,
          conversionRate: total > 0 ? ((conv / total) * 100).toFixed(1) + '%' : '0%'
        });
      } catch (e) {
        console.error("Stats error", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Leads" 
          value={stats.totalLeads} 
          icon={<UsersIcon className="w-6 h-6 text-blue-600"/>}
          color="bg-blue-50"
        />
        <StatCard 
          title="Pending Actions" 
          value={stats.newLeads} 
          icon={<ClockIcon className="w-6 h-6 text-orange-600"/>}
          color="bg-orange-50"
        />
        <StatCard 
          title="Clients Converted" 
          value={stats.converted} 
          icon={<CheckBadgeIcon className="w-6 h-6 text-green-600"/>}
          color="bg-green-50"
        />
        <StatCard 
          title="Conversion Rate" 
          value={stats.conversionRate} 
          icon={<CurrencyRupeeIcon className="w-6 h-6 text-purple-600"/>}
          color="bg-purple-50"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex gap-4">
           <a href="/admin/leads" className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800">
             Manage Leads
           </a>
           {/* Placeholder for future features */}
           <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 text-sm rounded-lg cursor-not-allowed">
             Create Invoice (Coming Soon)
           </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  );
}
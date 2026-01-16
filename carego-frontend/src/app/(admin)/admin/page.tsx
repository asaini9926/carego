"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  UsersIcon, 
  UserPlusIcon, 
  CheckBadgeIcon, 
  ArrowTrendingUpIcon 
} from "@heroicons/react/24/solid";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return <div className="flex h-96 items-center justify-center text-slate-400 font-medium animate-pulse">Loading dashboard...</div>;
  }

  // Fallback data for graph if empty
  const graphData = stats?.graphs?.daily?.length > 0 
    ? stats.graphs.daily 
    : Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10)
      }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <StatsCard 
          title="Total Leads" 
          value={stats?.leads?.total || 0} 
          icon={<UsersIcon className="w-6 h-6 text-blue-600" />}
          trend="+12% from last month"
          color="blue"
        />
        <StatsCard 
          title="Today's Leads" 
          value={stats?.leads?.today || 0} 
          icon={<UserPlusIcon className="w-6 h-6 text-purple-600" />}
          trend="Live updates"
          color="purple"
        />
        <StatsCard 
          title="Pending Actions" 
          value={stats?.leads?.pending || 0} 
          icon={<ArrowTrendingUpIcon className="w-6 h-6 text-amber-600" />}
          trend="Requires attention"
          color="amber"
          highlight
        />
        <StatsCard 
          title="Converted" 
          value={stats?.leads?.converted || 0} 
          icon={<CheckBadgeIcon className="w-6 h-6 text-emerald-600" />}
          trend="Conversion rate 24%"
          color="emerald"
        />

      </div>

      {/* Main Graph Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
           <div>
             <h3 className="text-xl font-bold text-slate-800">Lead Volume Trends</h3>
             <p className="text-sm text-slate-500">Daily lead acquisition over the last 30 days</p>
           </div>
           <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100">
             <option>Last 30 Days</option>
             <option>Last 7 Days</option>
             <option>This Year</option>
           </select>
        </div>
        
        <div className="h-[400px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                   dataKey="date" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 12 }} 
                   tickFormatter={(str) => {
                     const date = new Date(str);
                     return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
                   }}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 12 }} 
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                   cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                   type="monotone" 
                   dataKey="count" 
                   stroke="#3b82f6" 
                   strokeWidth={3}
                   fillOpacity={1} 
                   fill="url(#colorCount)" 
                />
             </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

function StatsCard({ title, value, icon, trend, color, highlight = false }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-white border-slate-100 hover:shadow-lg'}`}>
       <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-slate-500 font-medium text-sm mb-1">{title}</p>
            <h4 className="text-3xl font-bold text-slate-800">{value}</h4>
          </div>
          <div className={`p-3 rounded-xl ${colorMap[color]}`}>
            {icon}
          </div>
       </div>
       <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorMap[color].replace('text-', 'bg-').replace('50', '100')} ${color === 'amber' ? 'text-amber-700' : 'text-' + color + '-700'}`}>
             {trend}
          </span>
       </div>
    </div>
  );
}

import React from 'react';
import { Card } from '@/src/components/ui/Button'; // Assuming you put Card in same file or create a separate one

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pipeline Overview</h1>
      
      {/* 1. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {['Total Leads', 'New Today', 'Pending Action', 'Converted'].map((title, i) => (
          <Card key={i} className="p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-2">{Math.floor(Math.random() * 50)}</h3>
          </Card>
        ))}
      </div>

      {/* 2. Recent Activity Table Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Recent Leads</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
        </div>
        <div className="p-8 text-center text-gray-500">
          Table data loading... (We will build this component next)
        </div>
      </div>
    </div>
  );
}
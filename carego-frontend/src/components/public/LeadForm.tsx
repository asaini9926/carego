'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/src/lib/api';

type LeadFormData = {
  name: string;
  phone: string;
  city_name: string;
  service_interest_id: string;
  type: 'SERVICE';
};

export default function LeadForm({ cities, services }: { cities: any[], services: any[] }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LeadFormData>();
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const onSubmit = async (data: LeadFormData) => {
    setStatus('LOADING');
    try {
      await api.post('/public/leads', {
        ...data,
        type: 'SERVICE',
        source: 'website_home'
      });
      setStatus('SUCCESS');
      reset();
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
    }
  };

  if (status === 'SUCCESS') {
    return (
      <div className="bg-green-50 p-8 rounded-xl text-center border border-green-200">
        <h3 className="text-2xl font-bold text-green-700 mb-2">Request Received!</h3>
        <p className="text-green-600">Our care coordinator will call you within 15 minutes.</p>
        <button onClick={() => setStatus('IDLE')} className="mt-4 text-sm text-green-700 underline">Send another request</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-xl border border-gray-100">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Get a Free Consultation</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
          <input 
            {...register('name', { required: true })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Ex: Rajesh Kumar"
          />
          {errors.name && <span className="text-xs text-red-500">Name is required</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input 
            {...register('phone', { required: true, minLength: 10 })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Ex: 9876543210"
          />
          {errors.phone && <span className="text-xs text-red-500">Valid phone required</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select 
              {...register('city_name', { required: true })}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select 
              {...register('service_interest_id', { required: true })}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">Select Care</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          disabled={status === 'LOADING'}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
        >
          {status === 'LOADING' ? 'Sending...' : 'Request Call Back'}
        </button>
      </div>
    </form>
  );
}
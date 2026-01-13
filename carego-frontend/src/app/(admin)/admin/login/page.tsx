'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { adminApi } from '@/src/lib/api';
import { Button, Input } from '@/src/components/ui/Button';

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setError('');
      // This hits http://localhost:5000/api/v1/auth/login
      const res = await adminApi.post('/auth/login', {
        phone: data.phone,
        password: data.password
      });

      if (res.data.success) {
        // Save token to cookie (expires in 1 day)
        Cookies.set('admin_token', res.data.accessToken, { expires: 1 });
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Carego Admin</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to access the control panel</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input 
              {...register('phone', { required: true })}
              placeholder="9999999999"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <Input 
              type="password"
              {...register('password', { required: true })}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full h-11" isLoading={isSubmitting}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
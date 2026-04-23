'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import api from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', data);
      const token = response.data.data.token;
      localStorage.setItem('nexora_token', token);

      const companiesRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/companies`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const companies = companiesRes.data.data;
      const companyList = Array.isArray(companies) ? companies : [companies];
      if (companyList && companyList.length > 0 && companyList[0]?.id) {
        localStorage.setItem('nexora_company_id', companyList[0].id);
        localStorage.setItem('nexora_user_name', response.data.data.user?.fullName || '');
      }

      router.push('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else if (status === 404) {
        setError('No existe una cuenta con ese correo.');
      } else {
        setError('Error al iniciar sesión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-md border border-slate-200 p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Nexora</h1>
          </div>
          <p className="text-slate-500 text-sm">Facturación Electrónica Ecuador</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Correo electrónico
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="correo@empresa.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Contraseña
            </label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
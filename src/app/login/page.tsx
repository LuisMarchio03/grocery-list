'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, LogIn, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const err = await login(username, password)
    setSubmitting(false)
    if (err) {
      setError(err)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh py-12">
      <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
        <ShoppingBag size={28} className="text-white" />
      </div>

      <h1 className="text-xl font-semibold text-slate-900 mb-1">Entrar</h1>
      <p className="text-sm text-slate-500 mb-8">Acesse sua lista de compras</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuário</label>
          <input
            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Seu usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full h-11 pl-4 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
        >
          {submitting ? 'Entrando...' : (
            <>
              <LogIn size={18} />
              Entrar
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-slate-400 mt-8 text-center">
        Acesso apenas para usuários cadastrados
      </p>
    </div>
  )
}

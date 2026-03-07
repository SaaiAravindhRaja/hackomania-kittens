import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import AuthShell from '@/components/auth-shell'
import { Loader2 } from 'lucide-react'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
        {label}
      </label>
      {children}
      <p className="min-h-[16px] text-xs text-red-400">{error || ''}</p>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!values.email.trim()) e.email = 'Email is required.'
    else if (!emailPattern.test(values.email)) e.email = 'Enter a valid email.'
    if (!values.password) e.password = 'Password is required.'
    return e
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues(c => ({ ...c, [name]: value }))
    setErrors(c => { const n = { ...c }; delete n[name]; return n })
    setGlobalError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    setGlobalError(null)
    try {
      await login(values.email, values.password)
      navigate('/dashboard')
    } catch (err) {
      setGlobalError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-emerald-500/70 focus:bg-slate-800 focus:outline-none"

  return (
    <AuthShell
      eyebrow="account login"
      title="Welcome back."
      description="Sign in to manage your emergency funds."
      footerLabel="New to Kitten Finance?"
      footerLinkLabel="Create an account"
      footerLinkTo="/register"
    >
      {globalError && (
        <div className="mb-4 rounded-xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {globalError}
        </div>
      )}

      <form className="space-y-1" onSubmit={handleSubmit} noValidate>
        <Field label="Email" error={errors.email}>
          <input
            id="email" name="email" type="email" autoComplete="email"
            placeholder="you@example.com"
            value={values.email} onChange={handleChange}
            className={inputCls}
          />
        </Field>

        <Field label="Password" error={errors.password}>
          <input
            id="password" name="password" type="password" autoComplete="current-password"
            placeholder="Your password"
            value={values.password} onChange={handleChange}
            className={inputCls}
          />
        </Field>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
            ) : 'Log in'}
          </button>
        </div>
      </form>
    </AuthShell>
  )
}

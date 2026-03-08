import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import AuthShell from '@/components/auth-shell'
import { Loader2, Wallet } from 'lucide-react'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*\d).{8,}$/
const postalCodePattern = /^[0-9A-Za-z\s-]{3,10}$/
const walletPattern = /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._~-]+$/

function Field({ label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-[0.1em] text-slate-400">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-slate-600">{hint}</p>
      )}
      <p className="min-h-[16px] text-xs text-red-400">{error || ''}</p>
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [values, setValues] = useState({
    name: '', email: '', country: '', postalcode: '',
    walletAddress: '', password: '', confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!values.name.trim()) e.name = 'Name is required.'
    else if (values.name.trim().length < 2) e.name = 'At least 2 characters.'
    if (!values.email.trim()) e.email = 'Email is required.'
    else if (!emailPattern.test(values.email)) e.email = 'Enter a valid email.'
    if (!values.country.trim()) e.country = 'Country is required.'
    if (!values.postalcode.trim()) e.postalcode = 'Postal code is required.'
    else if (!postalCodePattern.test(values.postalcode.trim())) e.postalcode = 'Enter a valid postal code.'
    if (!values.walletAddress.trim()) e.walletAddress = 'Wallet address is required.'
    else if (!walletPattern.test(values.walletAddress.trim())) e.walletAddress = 'Must be like $ilp.interledger-test.dev/name'
    if (!values.password) e.password = 'Password is required.'
    else if (!passwordPattern.test(values.password)) e.password = 'Min 8 chars, include a number.'
    if (!values.confirmPassword) e.confirmPassword = 'Please confirm your password.'
    else if (values.password !== values.confirmPassword) e.confirmPassword = 'Passwords do not match.'
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
      await register(
        values.name.trim(),
        values.email.trim(),
        values.password,
        values.country.trim(),
        values.postalcode.trim(),
        values.walletAddress.trim(),
      )
      navigate('/dashboard')
    } catch (err) {
      setGlobalError(err.message || 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-700/80 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-600 transition-colors focus:border-emerald-500/70 focus:bg-slate-800 focus:outline-none"

  return (
    <AuthShell
      eyebrow="account onboarding"
      title="Join the network."
      description="Pool resources, protect communities, pay out instantly."
      footerLabel="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      {globalError && (
        <div className="mb-4 rounded-xl border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {globalError}
        </div>
      )}

      <form className="space-y-1" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" error={errors.name}>
            <input
              id="name" name="name" autoComplete="name" placeholder="Alex Morgan"
              value={values.name} onChange={handleChange}
              className={inputCls}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
              value={values.email} onChange={handleChange}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" error={errors.country}>
            <input
              id="country" name="country" autoComplete="country-name" placeholder="Singapore"
              value={values.country} onChange={handleChange}
              className={inputCls}
            />
          </Field>
          <Field label="Postal code" error={errors.postalcode}>
            <input
              id="postalcode" name="postalcode" autoComplete="postal-code" placeholder="123456"
              value={values.postalcode} onChange={handleChange}
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label="Interledger wallet address"
          hint="e.g. $ilp.interledger-test.dev/yourwallet"
          error={errors.walletAddress}
        >
          <div className="relative">
            <Wallet className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              id="walletAddress" name="walletAddress" autoComplete="off"
              placeholder="$ilp.interledger-test.dev/mymoney"
              value={values.walletAddress} onChange={handleChange}
              className={`${inputCls} pl-10 font-mono text-xs`}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" error={errors.password}>
            <input
              id="password" name="password" type="password" autoComplete="new-password"
              placeholder="8+ chars, 1 number"
              value={values.password} onChange={handleChange}
              className={inputCls}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirmPassword}>
            <input
              id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
              placeholder="Repeat password"
              value={values.confirmPassword} onChange={handleChange}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
            ) : 'Create account'}
          </button>
        </div>

        <p className="pt-1 text-center text-xs text-slate-700">
          By joining, you agree to community fund terms.
        </p>
      </form>
    </AuthShell>
  )
}

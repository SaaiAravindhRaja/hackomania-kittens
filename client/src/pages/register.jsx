import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import AuthShell from '@/components/auth-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*\d).{8,}$/

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '', walletAddress: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = 'Name is required.'
    else if (values.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters.'
    if (!values.email.trim()) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(values.email)) nextErrors.email = 'Enter a valid email address.'
    if (!values.password) nextErrors.password = 'Password is required.'
    else if (!passwordPattern.test(values.password)) nextErrors.password = 'Use at least 8 characters including one number.'
    if (!values.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
    else if (values.password !== values.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    if (!values.walletAddress.trim()) nextErrors.walletAddress = 'Wallet address is required.'
    else if (!values.walletAddress.startsWith('https://')) nextErrors.walletAddress = 'Must be a valid https:// wallet URL.'
    return nextErrors
  }

  const clearFieldError = (name) => {
    setErrors(cur => {
      if (!cur[name]) return cur
      const next = { ...cur }
      delete next[name]
      return next
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues(cur => ({ ...cur, [name]: value }))
    clearFieldError(name)
    setStatus(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    setStatus(null)
    try {
      await register(values.name, values.email, values.password, values.walletAddress)
      navigate('/dashboard')
    } catch (err) {
      setStatus({ variant: 'destructive', title: 'Registration failed', description: err.message || 'Could not create account.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="account onboarding"
      title="Create your account"
      description="Set up secure access to your Kitten Finance workspace."
      footerLabel="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      {status && (
        <Alert variant={status.variant}>
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.description}</AlertDescription>
        </Alert>
      )}

      <Form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField>
          <Label htmlFor="name" className="text-slate-700">Full name</Label>
          <Input
            id="name" name="name" autoComplete="name" placeholder="Alex Morgan"
            value={values.name} onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage>{errors.name ?? ' '}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="email" className="text-slate-700">Email</Label>
          <Input
            id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com"
            value={values.email} onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage>{errors.email ?? ' '}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="walletAddress" className="text-slate-700">
            Interledger wallet address
          </Label>
          <Input
            id="walletAddress" name="walletAddress" type="url"
            placeholder="https://ilp.interledger-test.dev/yourwallet"
            value={values.walletAddress} onChange={handleChange}
            aria-invalid={Boolean(errors.walletAddress)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white font-mono text-sm"
          />
          <FormMessage>{errors.walletAddress ?? ' '}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="password" className="text-slate-700">Password</Label>
          <Input
            id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters, one number"
            value={values.password} onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage>{errors.password ?? ' '}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="confirmPassword" className="text-slate-700">Confirm password</Label>
          <Input
            id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password"
            value={values.confirmPassword} onChange={handleChange}
            aria-invalid={Boolean(errors.confirmPassword)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage>{errors.confirmPassword ?? ' '}</FormMessage>
        </FormField>

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Create account'}
        </Button>

        <p className="text-center text-xs text-slate-500">
          By creating an account, you agree to the community fund terms.
        </p>
      </Form>
    </AuthShell>
  )
}

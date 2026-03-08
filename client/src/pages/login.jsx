import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import AuthShell from '@/components/auth-shell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const nextErrors = {}
    if (!values.email.trim()) nextErrors.email = 'Email is required.'
    else if (!emailPattern.test(values.email)) nextErrors.email = 'Enter a valid email address.'
    if (!values.password) nextErrors.password = 'Password is required.'
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
      await login(values.email, values.password)
      navigate('/dashboard')
    } catch (err) {
      setStatus({ variant: 'destructive', title: 'Sign-in failed', description: err.message || 'Invalid email or password.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="account login"
      title="Log in to Kitten Finance"
      description="Use your email and password to access your workspace."
      footerLabel="New to Kitten Finance?"
      footerLinkLabel="Create an account"
      footerLinkTo="/register"
    >
      {status && (
        <Alert variant={status.variant}>
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.description}</AlertDescription>
        </Alert>
      )}

      <Form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField>
          <Label htmlFor="email" className="text-slate-700">Email</Label>
          <Input
            id="email" name="email" type="email" autoComplete="email"
            placeholder="name@company.com"
            value={values.email} onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage>{errors.email ?? ' '}</FormMessage>
        </FormField>

        <FormField>
          <Label htmlFor="password" className="text-slate-700">Password</Label>
          <Input
            id="password" name="password" type="password" autoComplete="current-password"
            placeholder="Enter your password"
            value={values.password} onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/80 shadow-none focus-visible:bg-white"
          />
          <FormMessage>{errors.password ?? ' '}</FormMessage>
        </FormField>

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Log in'}
        </Button>
      </Form>
    </AuthShell>
  )
}

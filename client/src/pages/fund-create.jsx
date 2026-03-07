import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Shield, Zap, Users, Building2 } from 'lucide-react'

const DISASTER_TYPES = [
  { value: 'earthquake', label: 'Earthquake', icon: '🌍', desc: 'Triggered by seismic events' },
  { value: 'severe-weather', label: 'Severe Weather', icon: '🌪️', desc: 'Hurricanes, floods, tornadoes' },
]

const PAYOUT_TYPES = [
  { value: 'members', label: 'Fund Members', icon: Users, desc: 'Equal split among all joined members' },
  { value: 'designated', label: 'Designated Organisation', icon: Building2, desc: 'Single payout to a beneficiary wallet' },
]

export default function FundCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currency: 'USD',
    disasterType: 'earthquake',
    minMagnitude: '5',
    minSeverity: 'Severe',
    payoutType: 'members',
    beneficiaryWallet: '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name || !form.targetAmount) {
      setError('Fund name and target amount are required.')
      return
    }
    if (form.payoutType === 'designated' && !form.beneficiaryWallet) {
      setError('Beneficiary wallet address is required for designated payout.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const triggerRules = {
        disasterType: form.disasterType,
        minMagnitude: form.disasterType === 'earthquake' ? Number(form.minMagnitude) : undefined,
        minSeverity: form.disasterType === 'severe-weather' ? form.minSeverity : undefined,
      }
      const res = await api('/funds', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          targetAmount: Number(form.targetAmount),
          currency: form.currency,
          triggerRules,
          payoutType: form.payoutType,
          beneficiaryWallet: form.payoutType === 'designated' ? form.beneficiaryWallet : undefined,
        }),
      })
      navigate(`/funds/${res.fund.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Create Emergency Fund</h1>
        <p className="mt-1 text-sm text-slate-400">Set up a community fund with automatic disaster-triggered payouts</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                s === step ? 'bg-emerald-500 text-white' :
                s < step ? 'bg-emerald-900 text-emerald-300 cursor-pointer' :
                'bg-slate-800 text-slate-500'
              }`}
            >
              {s}
            </button>
            {s < 3 && <div className={`h-0.5 flex-1 rounded ${s < step ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-white">Fund Details</CardTitle>
              <CardDescription className="text-slate-400">Give your fund a name and set a contribution goal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Fund name *</Label>
                <Input
                  placeholder="e.g. Singapore Earthquake Relief"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Description</Label>
                <textarea
                  rows={3}
                  placeholder="What is this fund for? Who does it protect?"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Target amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <Input
                      type="number" min="1" placeholder="1000"
                      value={form.targetAmount}
                      onChange={e => set('targetAmount', e.target.value)}
                      className="border-slate-700 bg-slate-800 pl-7 text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Currency</Label>
                  <select
                    value={form.currency}
                    onChange={e => set('currency', e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button onClick={() => setStep(2)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                Next: Trigger Rules →
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Trigger Rules */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-white">Disaster Trigger</CardTitle>
              <CardDescription className="text-slate-400">Define what disaster events activate this fund</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-3">
                <Label className="text-slate-300">Disaster type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DISASTER_TYPES.map(dt => (
                    <button
                      key={dt.value}
                      onClick={() => set('disasterType', dt.value)}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        form.disasterType === dt.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl">{dt.icon}</span>
                      <span className="mt-2 font-medium">{dt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{dt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.disasterType === 'earthquake' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Minimum magnitude</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="3" max="8" step="0.5"
                      value={form.minMagnitude}
                      onChange={e => set('minMagnitude', e.target.value)}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="w-12 rounded-lg bg-slate-800 px-2 py-1 text-center text-sm font-bold text-emerald-400">
                      {form.minMagnitude}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {form.minMagnitude >= 7 ? 'Major earthquake — severe damage' :
                     form.minMagnitude >= 6 ? 'Strong earthquake — structural damage' :
                     form.minMagnitude >= 5 ? 'Moderate earthquake — some damage' :
                     'Light earthquake — minor shaking'}
                  </p>
                </div>
              )}

              {form.disasterType === 'severe-weather' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Minimum severity</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Moderate', 'Severe', 'Extreme'].map(s => (
                      <button
                        key={s}
                        onClick={() => set('minSeverity', s)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          form.minSeverity === s
                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">← Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white">Next: Payout →</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Payout Config */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-white">Payout Configuration</CardTitle>
              <CardDescription className="text-slate-400">Who receives the funds when a disaster triggers?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-2 gap-3">
                {PAYOUT_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    onClick={() => set('payoutType', pt.value)}
                    className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                      form.payoutType === pt.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <pt.icon className="h-5 w-5" />
                    <span className="mt-2 font-medium">{pt.label}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{pt.desc}</span>
                  </button>
                ))}
              </div>

              {form.payoutType === 'designated' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Beneficiary wallet address *</Label>
                  <Input
                    placeholder="https://ilp.interledger-test.dev/ngo-wallet"
                    value={form.beneficiaryWallet}
                    onChange={e => set('beneficiaryWallet', e.target.value)}
                    className="border-slate-700 bg-slate-800 font-mono text-sm text-white placeholder:text-slate-600"
                  />
                  <p className="text-xs text-slate-500">The Interledger wallet of the NGO or organisation</p>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 space-y-2 text-sm">
                <p className="font-medium text-slate-300">Fund Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>Name:</span><span className="text-slate-200">{form.name || '—'}</span>
                  <span>Target:</span><span className="text-slate-200">${form.targetAmount || '0'} {form.currency}</span>
                  <span>Trigger:</span><span className="text-slate-200">
                    {form.disasterType === 'earthquake' ? `Earthquake ≥ ${form.minMagnitude}` : `Weather ≥ ${form.minSeverity}`}
                  </span>
                  <span>Payouts to:</span><span className="text-slate-200">
                    {form.payoutType === 'members' ? 'All members (equal split)' : 'Designated org'}
                  </span>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">← Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : '🚀 Create Fund'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

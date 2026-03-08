import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
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
  const { user } = useAuth()
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
      const res = await post('/funds', {
        name: form.name,
        description: form.description,
        targetAmount: Number(form.targetAmount),
        currency: form.currency,
        triggerRules,
        payoutType: form.payoutType,
        beneficiaryWallet: form.payoutType === 'designated' ? form.beneficiaryWallet : undefined,
        creatorId: user?.user_id,
      })
      navigate(`/funds/${res.fund.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Create Emergency Fund</h1>
        <p className="mt-2 text-slate-400">Set up a community fund with automatic disaster-triggered payouts</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                s === step ? 'bg-emerald-500 text-white shadow-[0_0_16px_rgba(52,211,153,0.4)]' :
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
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl shadow-black/30">
            <CardHeader className="border-b border-slate-800 px-8 pt-8 pb-6">
              <CardTitle className="text-xl text-white">Fund Details</CardTitle>
              <CardDescription className="text-slate-400">Give your fund a name and set a contribution goal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pt-8 pb-8">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Fund name *</Label>
                <Input
                  placeholder="e.g. Singapore Earthquake Relief"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="h-12 border-slate-700 bg-slate-800/70 text-white placeholder:text-slate-600 focus:border-emerald-500/70"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Description</Label>
                <textarea
                  rows={4}
                  placeholder="What is this fund for? Who does it protect?"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/70 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Target amount *</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <Input
                      type="number" min="1" placeholder="1000"
                      value={form.targetAmount}
                      onChange={e => set('targetAmount', e.target.value)}
                      className="h-12 border-slate-700 bg-slate-800/70 pl-8 text-white placeholder:text-slate-600 focus:border-emerald-500/70"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Currency</Label>
                  <select
                    value={form.currency}
                    onChange={e => set('currency', e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 text-sm text-white focus:border-emerald-500/70 focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button onClick={() => setStep(2)} className="h-12 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_28px_rgba(52,211,153,0.35)] transition-all">
                Next: Trigger Rules →
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Trigger Rules */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl shadow-black/30">
            <CardHeader className="border-b border-slate-800 px-8 pt-8 pb-6">
              <CardTitle className="text-xl text-white">Disaster Trigger</CardTitle>
              <CardDescription className="text-slate-400">Define what disaster events activate this fund</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pt-8 pb-8">
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Disaster type</Label>
                <div className="grid grid-cols-2 gap-4">
                  {DISASTER_TYPES.map(dt => (
                    <button
                      key={dt.value}
                      onClick={() => set('disasterType', dt.value)}
                      className={`flex flex-col items-start rounded-xl border p-5 text-left transition-all ${
                        form.disasterType === dt.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_16px_rgba(52,211,153,0.15)]'
                          : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-3xl">{dt.icon}</span>
                      <span className="mt-3 font-semibold">{dt.label}</span>
                      <span className="text-xs text-slate-500 mt-1">{dt.desc}</span>
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
                <Button variant="outline" onClick={() => setStep(1)} className="h-12 flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">← Back</Button>
                <Button onClick={() => setStep(3)} className="h-12 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_28px_rgba(52,211,153,0.35)] transition-all">Next: Payout →</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Payout Config */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl shadow-black/30">
            <CardHeader className="border-b border-slate-800 px-8 pt-8 pb-6">
              <CardTitle className="text-xl text-white">Payout Configuration</CardTitle>
              <CardDescription className="text-slate-400">Who receives the funds when a disaster triggers?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pt-8 pb-8">
              <div className="grid grid-cols-2 gap-4">
                {PAYOUT_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    onClick={() => set('payoutType', pt.value)}
                    className={`flex flex-col items-start rounded-xl border p-5 text-left transition-all ${
                      form.payoutType === pt.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_16px_rgba(52,211,153,0.15)]'
                        : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <pt.icon className="h-6 w-6" />
                    <span className="mt-3 font-semibold">{pt.label}</span>
                    <span className="text-xs text-slate-500 mt-1">{pt.desc}</span>
                  </button>
                ))}
              </div>

              {form.payoutType === 'designated' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Beneficiary wallet address *</Label>
                  <Input
                    placeholder="https://ilp.interledger-test.dev/ngo-wallet"
                    value={form.beneficiaryWallet}
                    onChange={e => set('beneficiaryWallet', e.target.value)}
                    className="h-12 border-slate-700 bg-slate-800/70 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/70"
                  />
                  <p className="text-xs text-slate-500">The Interledger wallet of the NGO or organisation</p>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Fund Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-slate-500">Name</span><span className="text-slate-200 font-medium">{form.name || '—'}</span>
                  <span className="text-slate-500">Target</span><span className="text-slate-200 font-medium">${form.targetAmount || '0'} {form.currency}</span>
                  <span className="text-slate-500">Trigger</span><span className="text-slate-200 font-medium">
                    {form.disasterType === 'earthquake' ? `Earthquake ≥ M${form.minMagnitude}` : `Weather ≥ ${form.minSeverity}`}
                  </span>
                  <span className="text-slate-500">Payouts to</span><span className="text-slate-200 font-medium">
                    {form.payoutType === 'members' ? 'All members (equal split)' : 'Designated org'}
                  </span>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="h-12 flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">← Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-12 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_28px_rgba(52,211,153,0.35)] transition-all"
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Fund'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

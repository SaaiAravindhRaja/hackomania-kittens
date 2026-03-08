import { randomUUID } from 'crypto'

const funds = new Map()

export function createFund({ name, description, targetAmount, creatorId }) {
  const id = randomUUID()
  const fund = {
    id,
    name: String(name).trim(),
    description: String(description ?? '').trim(),
    targetAmount: Number(targetAmount) || 0,
    currentAmount: 0,
    members: [creatorId],
    createdAt: new Date().toISOString(),
  }
  funds.set(id, fund)
  return fund
}

export function getAllFunds() {
  return [...funds.values()]
}

export function getFund(id) {
  return funds.get(id) ?? null
}

export function joinFund(fundId, userId) {
  const fund = funds.get(fundId)
  if (!fund) return null
  if (!fund.members.includes(userId)) fund.members.push(userId)
  return fund
}

export function addToFund(fundId, amountDollars) {
  const fund = funds.get(fundId)
  if (!fund) return null
  fund.currentAmount = (fund.currentAmount || 0) + Number(amountDollars)
  return fund
}

import { Router } from 'express'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { isFinalizedGrantWithAccessToken, createAuthenticatedClient, OpenPaymentsClientError } from '@interledger/open-payments'
import { randomUUID } from 'crypto'
import { getClient, getUserById, logDonationEvent, logPayoutEvent, updateRunningTotal } from '../../clickhouse_auth.js'

const r = Router()
const clickhouseClient = getClient()

const globalAssetScale = 2
const paymentCompleteURI = process.env.PAYMENT_COMPLETE_BASE_URI ?? 'http://localhost:8009/payments/complete-single-payment'
const payoutGrantCompleteURI = process.env.PAYOUT_GRANT_COMPLETE_BASE_URI ?? 'http://localhost:8009/payments/complete-payout-grant'
const donationReturnBaseUrl = String(process.env.DONATION_RETURN_BASE_URL ?? 'http://localhost:5173').trim()
const serverPublicBaseUrl = String(process.env.SERVER_PUBLIC_BASE_URL ?? 'http://localhost:8009').trim()
const DEFAULT_DONOR_WALLET_URL = 'https://ilp.interledger-test.dev/nice-donator'
const pendingOutgoingPaymentGrants = {}
const pendingPayoutGrantInteractions = {}

let authenticatedClientPromise = null

async function recordDonationEvent(event) {
  try {
    await logDonationEvent(clickhouseClient, event)
  } catch (error) {
    console.error('Donation event logging failed:', error)
  }
}

async function recordPayoutEvent(event) {
  try {
    await logPayoutEvent(clickhouseClient, event)
  } catch (error) {
    console.error('Payout event logging failed:', error)
  }
}

function parseAmountCents(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function toDollars(amountCents) {
  return (amountCents / 10 ** globalAssetScale).toFixed(globalAssetScale)
}

function normalizeWalletUrl(walletAddressOrUrl) {
  const raw = String(walletAddressOrUrl ?? '').trim()

  if (!raw) {
    throw new Error('Wallet address is required.')
  }

  if (raw.startsWith('$')) {
    return `https://${raw.slice(1)}`
  }

  if (raw.startsWith('https://')) {
    return raw
  }

  if (raw.startsWith('http://')) {
    return raw
  }

  throw new Error('Wallet address must start with $ or http(s)://')
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? '').trim())
}

function getReceiverWalletUrl() {
  const walletUrl = String(process.env.RECEIVER_WALLET_ADDRESS_URL ?? '').trim()
  if (!walletUrl) {
    throw new Error('RECEIVER_WALLET_ADDRESS_URL is not configured.')
  }
  return walletUrl
}

function getFundManagerWalletUrl() {
  const walletUrl = String(process.env.WALLET_ADDRESS_URL ?? '').trim()
  if (!walletUrl) {
    throw new Error('WALLET_ADDRESS_URL is not configured.')
  }
  return walletUrl
}

function getSafeReceiverWalletUrl() {
  try {
    return getReceiverWalletUrl()
  } catch {
    return ''
  }
}

function buildDonationReturnUrl(status, params = {}) {
  const base = donationReturnBaseUrl.endsWith('/')
    ? donationReturnBaseUrl.slice(0, -1)
    : donationReturnBaseUrl
  const url = new URL(`${base}/dashboard`)
  url.searchParams.set('donation', status)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (!text) continue
    url.searchParams.set(key, text)
  }

  return url.toString()
}

function shouldReturnJson(req) {
  const requestedFormat = String(req.query?.format ?? '').toLowerCase()
  if (requestedFormat === 'json') {
    return true
  }

  const acceptHeader = String(req.get('accept') ?? '')
  return acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')
}

function buildServerUrl(pathname) {
  const base = serverPublicBaseUrl.endsWith('/')
    ? serverPublicBaseUrl.slice(0, -1)
    : serverPublicBaseUrl
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${normalizedPath}`
}

function buildPayoutApprovalLinks(interactionId) {
  return {
    approvalUrl: buildServerUrl(`/payments/payout-approval/${interactionId}`),
    rejectUrl: buildServerUrl(`/payments/payout-reject/${interactionId}`),
  }
}

function isMissingInteractError(error) {
  if (!(error instanceof OpenPaymentsClientError)) return false
  const description = String(error.description ?? '').toLowerCase()
  return error.code === 'invalid_request' && description.includes('interact')
}

function isPendingGrantResponse(grant) {
  return Boolean(grant?.continue?.uri && grant?.continue?.access_token?.value && grant?.interact?.redirect)
}

function createPendingPayoutInteraction({
  stage,
  continueUri,
  continueAccessToken,
  interactRedirectUrl,
  event = {},
  user = {},
  amountCents = 0,
  recipientWallet = {},
  fundManagerWallet = {},
  metadata = {},
  incomingPaymentId = '',
  quote = null,
}) {
  const interactionId = randomUUID()
  pendingPayoutGrantInteractions[interactionId] = {
    stage,
    continueUri,
    continueAccessToken,
    interactRedirectUrl,
    createdAt: new Date().toISOString(),
    event,
    user,
    amountCents,
    recipientWallet,
    fundManagerWallet,
    metadata,
    incomingPaymentId,
    quote,
  }
  return {
    interactionId,
    interactRedirectUrl,
    ...buildPayoutApprovalLinks(interactionId),
  }
}

async function getAuthenticatedClient() {
  if (authenticatedClientPromise) {
    return authenticatedClientPromise
  }

  authenticatedClientPromise = (async () => {
    const keyId = String(process.env.FUNDMANAGER_KEY_ID ?? '').trim()
    const walletAddressUrl = String(process.env.WALLET_ADDRESS_URL ?? '').trim()

    if (!keyId || !walletAddressUrl) {
      throw new Error('FUNDMANAGER_KEY_ID and WALLET_ADDRESS_URL must be configured.')
    }

    const keyPath = process.env.FUNDMANAGER_PRIVATE_KEY_PATH
      ? path.resolve(process.env.FUNDMANAGER_PRIVATE_KEY_PATH)
      : path.resolve(process.cwd(), 'private.key')
    const privateKey = (await readFile(keyPath, 'utf8')).trim()

    if (!privateKey) {
      throw new Error(`No private key content found at ${keyPath}`)
    }

    return createAuthenticatedClient({
      keyId,
      privateKey,
      walletAddressUrl,
    })
  })().catch((error) => {
    authenticatedClientPromise = null
    throw error
  })

  return authenticatedClientPromise
}

function logOpenPaymentsError(error) {
  if (error instanceof OpenPaymentsClientError) {
    console.log(error.message)
    console.log(error.description)
    console.log(error.status)
    console.log(error.code)
    console.log(error.validationErrors)
    console.log(error.details)
  }

  console.log(error.stack);
  console.log(error)
}

async function getWallet(client, url) {
  return client.walletAddress.get({ url })
}

async function createIncomingPayment(client, receivingWallet, amount, metadata) {
  const incomingPaymentGrant = await client.grant.request(
    { url: receivingWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            actions: ['read', 'create'],
          },
        ],
      },
    }
  )

  return client.incomingPayment.create(
    {
      url: receivingWallet.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    {
      walletAddress: receivingWallet.id,
      metadata,
      incomingAmount: {
        assetCode: receivingWallet.assetCode,
        assetScale: globalAssetScale,
        value: amount,
      },
    }
  )
}

async function createQuote(client, receivingWallet, payingWallet, incomingPayment) {
  const quoteGrant = await client.grant.request(
    { url: payingWallet.authServer },
    {
      access_token: {
        access: [
          {
            type: 'quote',
            actions: ['create', 'read'],
          },
        ],
      },
    }
  )

  return client.quote.create(
    {
      url: receivingWallet.resourceServer,
      accessToken: quoteGrant.access_token.value,
    },
    {
      walletAddress: payingWallet.id,
      receiver: incomingPayment.id,
      method: 'ilp',
    }
  )
}

async function createOutgoingPaymentGrant(client, payingWallet, quote, interval = null) {
  const uid = randomUUID()
  const accessItem = {
    type: 'outgoing-payment',
    actions: ['read', 'create', 'list'],
    identifier: payingWallet.id,
    limits: {
      debitAmount: quote.debitAmount,
    },
  }

  if (interval) {
    accessItem.interval = interval
  }

  const outgoingPaymentGrant = await client.grant.request(
    { url: payingWallet.authServer },
    {
      access_token: {
        access: [accessItem],
      },
      interact: {
        start: ['redirect'],
        finish: {
          method: 'redirect',
          uri: `${paymentCompleteURI}/${uid}`,
          nonce: randomUUID(),
        },
      },
    }
  )

  return [uid, outgoingPaymentGrant]
}

async function requestFinalizedGrant(client, authServerUrl, access) {
  const grant = await client.grant.request(
    { url: authServerUrl },
    {
      access_token: {
        access: [access],
      },
    }
  )

  if (!isFinalizedGrantWithAccessToken(grant)) {
    throw new Error('Grant requires interactive consent and cannot be auto-completed for disaster payouts.')
  }

  return grant
}

function snapshotWallet(wallet) {
  return {
    id: wallet.id,
    authServer: wallet.authServer,
    resourceServer: wallet.resourceServer,
    assetCode: wallet.assetCode,
    assetScale: wallet.assetScale,
  }
}

async function requestPayoutGrantAccess({
  client,
  authServerUrl,
  access,
  stage,
  interactionState,
}) {
  try {
    const grant = await client.grant.request(
      { url: authServerUrl },
      {
        access_token: {
          access: [access],
        },
      }
    )

    if (isFinalizedGrantWithAccessToken(grant)) {
      return {
        status: 'finalized',
        accessToken: grant.access_token.value,
      }
    }

    if (isPendingGrantResponse(grant)) {
      const pending = createPendingPayoutInteraction({
        stage,
        continueUri: grant.continue.uri,
        continueAccessToken: grant.continue.access_token.value,
        interactRedirectUrl: grant.interact.redirect,
        ...interactionState,
      })

      return {
        status: 'pending',
        stage,
        ...pending,
      }
    }

    throw new Error(`Unexpected grant state for ${stage} stage.`)
  } catch (error) {
    if (!isMissingInteractError(error)) {
      throw error
    }

    const interactionId = randomUUID()
    const interactiveGrant = await client.grant.request(
      { url: authServerUrl },
      {
        access_token: {
          access: [access],
        },
        interact: {
          start: ['redirect'],
          finish: {
            method: 'redirect',
            uri: `${payoutGrantCompleteURI}/${interactionId}`,
            nonce: randomUUID(),
          },
        },
      }
    )

    if (isFinalizedGrantWithAccessToken(interactiveGrant)) {
      return {
        status: 'finalized',
        accessToken: interactiveGrant.access_token.value,
      }
    }

    if (!isPendingGrantResponse(interactiveGrant)) {
      throw new Error(`Interactive grant was not finalized or pending for ${stage} stage.`)
    }

    pendingPayoutGrantInteractions[interactionId] = {
      stage,
      continueUri: interactiveGrant.continue.uri,
      continueAccessToken: interactiveGrant.continue.access_token.value,
      interactRedirectUrl: interactiveGrant.interact.redirect,
      createdAt: new Date().toISOString(),
      ...interactionState,
    }

    return {
      status: 'pending',
      stage,
      interactionId,
      interactRedirectUrl: interactiveGrant.interact.redirect,
      ...buildPayoutApprovalLinks(interactionId),
    }
  }
}

async function initiateDonationRequest({ donorWalletAddressOrUrl, amountCents, donationContext = {} }) {
  const client = await getAuthenticatedClient()
  const donorWallet = await getWallet(client, normalizeWalletUrl(donorWalletAddressOrUrl))
  const fundManagerWallet = await getWallet(client, getReceiverWalletUrl())
  const amount = String(amountCents)
  const metadata = { description: `Incoming donation of $${toDollars(amountCents)}` }

  console.log(donorWallet, fundManagerWallet);
  const incomingPayment = await createIncomingPayment(client, fundManagerWallet, amount, metadata)
  const quote = await createQuote(client, fundManagerWallet, donorWallet, incomingPayment)

  const [id, outgoingPaymentGrant] = await createOutgoingPaymentGrant(client, donorWallet, quote)

  pendingOutgoingPaymentGrants[id] = { outgoingGrant: outgoingPaymentGrant, donorWallet, quote, donationContext }

  return {
    id,
    redirectUrl: outgoingPaymentGrant.interact.redirect,
    amountCents,
  }
}

async function continueDonationByUid(uid, interactRef) {
  const pending = pendingOutgoingPaymentGrants[uid]
  if (!pending) {
    throw new Error('No pending payment found for this authorization request.')
  }

  const client = await getAuthenticatedClient()
  const { outgoingGrant, donorWallet, quote, donationContext } = pending

  const continueGrantResult = await client.grant.continue(
    {
      url: outgoingGrant.continue.uri,
      accessToken: outgoingGrant.continue.access_token.value,
    },
    { interact_ref: interactRef }
  )

  if (!isFinalizedGrantWithAccessToken(continueGrantResult)) {
    throw new Error('Expected finalized grant with access token.')
  }

  const outgoingPayment = await client.outgoingPayment.create(
    {
      url: donorWallet.resourceServer,
      accessToken: continueGrantResult.access_token.value,
    },
    {
      walletAddress: donorWallet.id,
      quoteId: quote.id,
      metadata: { description: `Donated $${quote.debitAmount.value / 10 ** globalAssetScale} to Kitten Disaster Fund.` },
    }
  )

  delete pendingOutgoingPaymentGrants[uid]

  return { outgoingPayment, donationContext }
}

async function executeFundManagerPayout({ recipientWalletAddressOrUrl, amountCents, metadata, event = {}, user = {} }) {
  const client = await getAuthenticatedClient()
  const recipientWallet = await getWallet(client, normalizeWalletUrl(recipientWalletAddressOrUrl))
  const fundManagerWallet = await getWallet(client, normalizeWalletUrl(getFundManagerWalletUrl()))
  const amount = String(amountCents)

  const incomingPaymentGrant = await requestFinalizedGrant(client, recipientWallet.authServer, {
    type: 'incoming-payment',
    actions: ['read', 'create'],
  })

  const incomingPayment = await client.incomingPayment.create(
    {
      url: recipientWallet.resourceServer,
      accessToken: incomingPaymentGrant.access_token.value,
    },
    {
      walletAddress: recipientWallet.id,
      metadata,
      incomingAmount: {
        assetCode: recipientWallet.assetCode,
        assetScale: globalAssetScale,
        value: amount,
      },
    }
  )

  const quoteGrantResult = await requestPayoutGrantAccess({
    client,
    authServerUrl: fundManagerWallet.authServer,
    access: {
      type: 'quote',
      actions: ['create', 'read'],
    },
    stage: 'quote',
    interactionState: {
      event: {
        id: event.id ?? '',
        title: event.title ?? '',
      },
      user: {
        user_id: user.user_id ?? '',
        username: user.username ?? '',
      },
      amountCents,
      metadata,
      recipientWalletAddress: recipientWalletAddressOrUrl,
      recipientWallet: snapshotWallet(recipientWallet),
      fundManagerWallet: snapshotWallet(fundManagerWallet),
      incomingPaymentId: incomingPayment.id,
    },
  })

  if (quoteGrantResult.status === 'pending') {
    return {
      pending: true,
      stage: quoteGrantResult.stage,
      interactionId: quoteGrantResult.interactionId,
      interactRedirectUrl: quoteGrantResult.interactRedirectUrl,
      approvalUrl: quoteGrantResult.approvalUrl,
      rejectUrl: quoteGrantResult.rejectUrl,
      message: 'Payout requires approval before quote creation.',
    }
  }

  const quote = await client.quote.create(
    {
      url: recipientWallet.resourceServer,
      accessToken: quoteGrantResult.accessToken,
    },
    {
      walletAddress: fundManagerWallet.id,
      receiver: incomingPayment.id,
      method: 'ilp',
    }
  )

  const outgoingGrantResult = await requestPayoutGrantAccess({
    client,
    authServerUrl: fundManagerWallet.authServer,
    access: {
      type: 'outgoing-payment',
      actions: ['read', 'create', 'list'],
      identifier: fundManagerWallet.id,
      limits: {
        debitAmount: quote.debitAmount,
      },
    },
    stage: 'outgoing',
    interactionState: {
      event: {
        id: event.id ?? '',
        title: event.title ?? '',
      },
      user: {
        user_id: user.user_id ?? '',
        username: user.username ?? '',
      },
      amountCents,
      metadata,
      recipientWalletAddress: recipientWalletAddressOrUrl,
      recipientWallet: snapshotWallet(recipientWallet),
      fundManagerWallet: snapshotWallet(fundManagerWallet),
      incomingPaymentId: incomingPayment.id,
      quote,
    },
  })

  if (outgoingGrantResult.status === 'pending') {
    return {
      pending: true,
      stage: outgoingGrantResult.stage,
      interactionId: outgoingGrantResult.interactionId,
      interactRedirectUrl: outgoingGrantResult.interactRedirectUrl,
      approvalUrl: outgoingGrantResult.approvalUrl,
      rejectUrl: outgoingGrantResult.rejectUrl,
      message: 'Payout requires approval before sending funds.',
    }
  }

  const outgoingPayment = await client.outgoingPayment.create(
    {
      url: fundManagerWallet.resourceServer,
      accessToken: outgoingGrantResult.accessToken,
    },
    {
      walletAddress: fundManagerWallet.id,
      quoteId: quote.id,
      metadata,
    }
  )

  return { quote, outgoingPayment }
}

async function continuePendingPayoutInteraction(interactionId, interactRef) {
  const pending = pendingPayoutGrantInteractions[interactionId]
  if (!pending) {
    throw new Error('No pending payout interaction found.')
  }

  const client = await getAuthenticatedClient()
  const continueGrantResult = await client.grant.continue(
    {
      url: pending.continueUri,
      accessToken: pending.continueAccessToken,
    },
    { interact_ref: interactRef }
  )

  if (!isFinalizedGrantWithAccessToken(continueGrantResult)) {
    throw new Error('Expected finalized grant with access token.')
  }

  const finalizedAccessToken = continueGrantResult.access_token.value
  delete pendingPayoutGrantInteractions[interactionId]

  if (pending.stage === 'quote') {
    const quote = await client.quote.create(
      {
        url: pending.recipientWallet.resourceServer,
        accessToken: finalizedAccessToken,
      },
      {
        walletAddress: pending.fundManagerWallet.id,
        receiver: pending.incomingPaymentId,
        method: 'ilp',
      }
    )

    const outgoingGrantResult = await requestPayoutGrantAccess({
      client,
      authServerUrl: pending.fundManagerWallet.authServer,
      access: {
        type: 'outgoing-payment',
        actions: ['read', 'create', 'list'],
        identifier: pending.fundManagerWallet.id,
        limits: {
          debitAmount: quote.debitAmount,
        },
      },
      stage: 'outgoing',
      interactionState: {
        event: pending.event,
        user: pending.user,
        amountCents: pending.amountCents,
        metadata: pending.metadata,
        recipientWalletAddress: pending.recipientWalletAddress,
        recipientWallet: pending.recipientWallet,
        fundManagerWallet: pending.fundManagerWallet,
        incomingPaymentId: pending.incomingPaymentId,
        quote,
      },
    })

    if (outgoingGrantResult.status === 'pending') {
      return {
        status: 'pending',
        stage: outgoingGrantResult.stage,
        interactionId: outgoingGrantResult.interactionId,
        interactRedirectUrl: outgoingGrantResult.interactRedirectUrl,
        approvalUrl: outgoingGrantResult.approvalUrl,
        rejectUrl: outgoingGrantResult.rejectUrl,
        event: pending.event,
        user: pending.user,
        amountCents: pending.amountCents,
        recipientWalletAddress: pending.recipientWalletAddress,
      }
    }

    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: pending.fundManagerWallet.resourceServer,
        accessToken: outgoingGrantResult.accessToken,
      },
      {
        walletAddress: pending.fundManagerWallet.id,
        quoteId: quote.id,
        metadata: pending.metadata,
      }
    )

    return {
      status: 'success',
      outgoingPayment,
      event: pending.event,
      user: pending.user,
      amountCents: pending.amountCents,
      recipientWalletAddress: pending.recipientWalletAddress,
    }
  }

  if (pending.stage === 'outgoing') {
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: pending.fundManagerWallet.resourceServer,
        accessToken: finalizedAccessToken,
      },
      {
        walletAddress: pending.fundManagerWallet.id,
        quoteId: pending.quote.id,
        metadata: pending.metadata,
      }
    )

    return {
      status: 'success',
      outgoingPayment,
      event: pending.event,
      user: pending.user,
      amountCents: pending.amountCents,
      recipientWalletAddress: pending.recipientWalletAddress,
    }
  }

  throw new Error(`Unsupported payout interaction stage: ${pending.stage}`)
}

function renderPayoutApprovalPage(pending, interactionId) {
  const amount = toDollars(pending.amountCents)
  const title = String(pending.event?.title ?? 'Disaster payout')
  const recipient = String(pending.user?.username ?? pending.recipientWalletAddress ?? 'recipient')
  const rejectUrl = buildServerUrl(`/payments/payout-reject/${interactionId}`)
  const acceptUrl = String(pending.interactRedirectUrl ?? '').trim()
  const dashboardUrl = buildDonationReturnUrl('success')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payout Approval</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .wrap { max-width: 720px; margin: 48px auto; padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
      h1 { margin-top: 0; font-size: 24px; }
      p { line-height: 1.5; }
      .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 16px 0; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
      a.btn { display: inline-block; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; }
      a.primary { background: #0f172a; color: #fff; }
      a.secondary { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
      a.link { color: #334155; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Approve Disaster Payout</h1>
      <p>This payout needs approval before funds can be sent.</p>
      <div class="meta">
        <p><strong>Event:</strong> ${title}</p>
        <p><strong>Recipient:</strong> ${recipient}</p>
        <p><strong>Amount:</strong> $${amount}</p>
      </div>
      <div class="actions">
        <a class="btn primary" href="${acceptUrl}">Accept payout</a>
        <a class="btn secondary" href="${rejectUrl}">Reject payout</a>
      </div>
      <p style="margin-top: 18px;"><a class="link" href="${dashboardUrl}">Back to dashboard</a></p>
    </div>
  </body>
</html>`
}

function serializePendingPayoutInteraction(interactionId, pending) {
  return {
    interactionId,
    stage: pending.stage ?? '',
    eventId: pending.event?.id ?? '',
    eventTitle: pending.event?.title ?? '',
    userId: pending.user?.user_id ?? '',
    username: pending.user?.username ?? '',
    recipientWalletAddress: pending.recipientWalletAddress ?? '',
    amountCents: Number(pending.amountCents ?? 0),
    amountDollars: toDollars(Number(pending.amountCents ?? 0)),
    createdAt: pending.createdAt ?? '',
    popupUrl: pending.interactRedirectUrl ?? '',
    approvalUrl: buildServerUrl(`/payments/payout-approval/${interactionId}`),
    rejectUrl: buildServerUrl(`/payments/payout-reject/${interactionId}`),
  }
}

function parseInteractionIds(rawValue) {
  if (!Array.isArray(rawValue)) {
    return []
  }

  return [...new Set(rawValue.map((item) => String(item ?? '').trim()).filter(Boolean))]
}

async function rejectPendingPayoutInteraction(interactionId) {
  const pending = pendingPayoutGrantInteractions[interactionId]
  if (!pending) {
    return null
  }

  delete pendingPayoutGrantInteractions[interactionId]

  await recordPayoutEvent({
    disasterEventId: pending.event?.id ?? '',
    disasterEventTitle: pending.event?.title ?? '',
    userId: pending.user?.user_id ?? '',
    username: pending.user?.username ?? '',
    recipientWalletAddress: pending.recipientWalletAddress ?? '',
    amountCents: pending.amountCents ?? 0,
    success: false,
    errorMessage: 'Payout rejected on approval page.',
  })

  return pending
}

export async function runDisasterPayouts(affectedUsers = [], event = {}) {
  const results = []

  for (const user of affectedUsers) {
    const amountCents = Number(user.paymentCents ?? 0)
    const walletAddress = String(user.wallet_address ?? '').trim()

    if (!walletAddress) {
      results.push({
        user_id: user.user_id,
        username: user.username,
        wallet_address: user.wallet_address ?? '',
        paymentCents: amountCents,
        success: false,
        error: 'Missing recipient wallet address.',
      })
      await recordPayoutEvent({
        disasterEventId: event.id ?? '',
        disasterEventTitle: event.title ?? '',
        userId: user.user_id ?? '',
        username: user.username ?? '',
        recipientWalletAddress: user.wallet_address ?? '',
        amountCents,
        success: false,
        errorMessage: 'Missing recipient wallet address.',
      })
      continue
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      results.push({
        user_id: user.user_id,
        username: user.username,
        wallet_address: walletAddress,
        paymentCents: amountCents,
        success: false,
        error: 'Invalid payout amount.',
      })
      await recordPayoutEvent({
        disasterEventId: event.id ?? '',
        disasterEventTitle: event.title ?? '',
        userId: user.user_id ?? '',
        username: user.username ?? '',
        recipientWalletAddress: walletAddress,
        amountCents,
        success: false,
        errorMessage: 'Invalid payout amount.',
      })
      continue
    }

    try {
      const metadata = {
        description: `Disaster payout $${toDollars(amountCents)} for ${event.title ?? 'event'}`,
        eventId: event.id ?? '',
        userId: user.user_id,
      }

      const payoutResult = await executeFundManagerPayout({
        recipientWalletAddressOrUrl: walletAddress,
        amountCents,
        metadata,
        event: {
          id: event.id ?? '',
          title: event.title ?? '',
        },
        user: {
          user_id: user.user_id ?? '',
          username: user.username ?? '',
        },
      })

      if (payoutResult?.pending) {
        results.push({
          user_id: user.user_id,
          username: user.username,
          wallet_address: walletAddress,
          paymentCents: amountCents,
          paymentDollars: toDollars(amountCents),
          success: false,
          pending: true,
          stage: payoutResult.stage,
          interactionId: payoutResult.interactionId,
          popupUrl: payoutResult.interactRedirectUrl,
          approvalUrl: payoutResult.approvalUrl,
          rejectUrl: payoutResult.rejectUrl,
          message: payoutResult.message,
        })
        await recordPayoutEvent({
          disasterEventId: event.id ?? '',
          disasterEventTitle: event.title ?? '',
          userId: user.user_id ?? '',
          username: user.username ?? '',
          recipientWalletAddress: walletAddress,
          amountCents,
          success: false,
          errorMessage: `Pending approval at ${payoutResult.stage} stage.`,
        })
        continue
      }

      const outgoingPayment = payoutResult.outgoingPayment

      results.push({
        user_id: user.user_id,
        username: user.username,
        wallet_address: walletAddress,
        paymentCents: amountCents,
        paymentDollars: toDollars(amountCents),
        success: true,
        outgoingPaymentId: outgoingPayment.id ?? null,
      })

      await recordPayoutEvent({
        disasterEventId: event.id ?? '',
        disasterEventTitle: event.title ?? '',
        userId: user.user_id ?? '',
        username: user.username ?? '',
        recipientWalletAddress: walletAddress,
        amountCents,
        success: true,
        outgoingPaymentId: outgoingPayment.id ?? '',
      })
    } catch (error) {
      logOpenPaymentsError(error)
      results.push({
        user_id: user.user_id,
        username: user.username,
        wallet_address: walletAddress,
        paymentCents: amountCents,
        paymentDollars: toDollars(amountCents),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
      await recordPayoutEvent({
        disasterEventId: event.id ?? '',
        disasterEventTitle: event.title ?? '',
        userId: user.user_id ?? '',
        username: user.username ?? '',
        recipientWalletAddress: walletAddress,
        amountCents,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const successCount = results.filter((item) => item.success).length
  const pendingCount = results.filter((item) => item.pending).length
  const failureCount = results.length - successCount - pendingCount
  const totalPayoutCents = results
    .filter((item) => item.success)
    .reduce((sum, item) => sum + Number(item.paymentCents || 0), 0)

  return {
    successCount,
    pendingCount,
    failureCount,
    totalPayoutCents,
    totalPayoutDollars: toDollars(totalPayoutCents),
    results,
  }
}

r.get('/pay-single', async (req, res) => {
  const amountCents = parseAmountCents(req.query.amountCents) ?? 10000
  const donorWalletAddressOrUrl = String(req.query.walletAddress ?? req.query.walletUrl ?? DEFAULT_DONOR_WALLET_URL)

  try {
    const donation = await initiateDonationRequest({
      donorWalletAddressOrUrl,
      amountCents,
    })

    return res.redirect(302, donation.redirectUrl)
  } catch (error) {
    logOpenPaymentsError(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to start donation.' })
  }
})

r.post('/donate', async (req, res) => {
  const amountCents = parseAmountCents(req.body?.amountCents)
  const donorWalletAddressOrUrl = String(req.body?.walletAddress ?? req.body?.walletUrl ?? '').trim()
  const userId = String(req.body?.userId ?? '').trim()
  const userEmail = String(req.body?.userEmail ?? '').trim().toLowerCase()

  if (!amountCents) {
    return res.status(400).json({ error: 'amountCents must be a positive integer.' })
  }

  if (!donorWalletAddressOrUrl) {
    return res.status(400).json({ error: 'walletAddress is required.' })
  }

  if (!userId || !userEmail) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: 'Missing userId or userEmail',
    })
    return res.status(401).json({ error: 'Authentication is required to start a donation.' })
  }

  if (!isUuid(userId)) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: 'Invalid userId format',
    })
    return res.status(401).json({ error: 'Invalid authentication context.' })
  }

  let donorUser = null
  try {
    donorUser = await getUserById(clickhouseClient, userId)
  } catch (error) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: error instanceof Error ? error.message : 'Unable to verify donor account',
    })
    return res.status(500).json({ error: 'Unable to verify donor account.' })
  }

  if (!donorUser || String(donorUser.email ?? '').toLowerCase() !== userEmail) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: 'User account mismatch',
    })
    return res.status(401).json({ error: 'Authenticated user does not match a registered account.' })
  }

  const registeredWalletAddress = String(donorUser.wallet_address ?? '').trim()
  if (!registeredWalletAddress) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: 'Registered account has no wallet address',
    })
    return res.status(400).json({ error: 'No wallet is linked to this account. Please contact support.' })
  }

  let normalizedInputWallet = ''
  let normalizedRegisteredWallet = ''
  try {
    normalizedInputWallet = normalizeWalletUrl(donorWalletAddressOrUrl)
    normalizedRegisteredWallet = normalizeWalletUrl(registeredWalletAddress)
  } catch (error) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: error instanceof Error ? error.message : 'Invalid wallet address',
    })
    return res.status(400).json({ error: 'Invalid wallet address format.' })
  }

  if (normalizedInputWallet !== normalizedRegisteredWallet) {
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: donorWalletAddressOrUrl,
      amountCents,
      errorMessage: 'Donation wallet does not match registered wallet',
    })
    return res.status(400).json({ error: 'Donation wallet must match your registered wallet address.' })
  }

  try {
    const donation = await initiateDonationRequest({
      donorWalletAddressOrUrl: registeredWalletAddress,
      amountCents,
      donationContext: {
        userId,
        email: userEmail,
        donorWalletAddress: registeredWalletAddress,
        amountCents,
      },
    })

    await recordDonationEvent({
      donationId: donation.id,
      status: 'initiated',
      userId,
      email: userEmail,
      donorWalletAddress: registeredWalletAddress,
      fundWalletUrl: getSafeReceiverWalletUrl(),
      amountCents,
      redirectUrl: donation.redirectUrl,
    })

    return res.json({
      success: true,
      grantId: donation.id,
      amountCents: donation.amountCents,
      redirectUrl: donation.redirectUrl,
    })
  } catch (error) {
    logOpenPaymentsError(error)
    await recordDonationEvent({
      status: 'failed',
      userId,
      email: userEmail,
      donorWalletAddress: registeredWalletAddress,
      fundWalletUrl: getSafeReceiverWalletUrl(),
      amountCents,
      errorMessage: error instanceof Error ? error.message : 'Unable to start donation',
    })
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to start donation.' })
  }
})

r.get('/complete-single-payment/:uid', async (req, res) => {
  const interactRef = String(req.query.interact_ref ?? '').trim()
  const pendingPayment = pendingOutgoingPaymentGrants[req.params.uid]
  const donationContext = pendingPayment?.donationContext ?? {}

  if (!interactRef) {
    const redirectUrl = buildDonationReturnUrl('failed', {
      grantId: req.params.uid,
      error: 'Missing interact_ref',
    })

    if (!shouldReturnJson(req)) {
      return res.redirect(302, redirectUrl)
    }

    return res.status(400).json({ error: 'interact_ref is required.' })
  }

  try {
    const { outgoingPayment, donationContext: finalizedContext } = await continueDonationByUid(req.params.uid, interactRef)
    await recordDonationEvent({
      donationId: req.params.uid,
      status: 'completed',
      userId: finalizedContext?.userId ?? donationContext?.userId ?? '',
      email: finalizedContext?.email ?? donationContext?.email ?? '',
      donorWalletAddress: finalizedContext?.donorWalletAddress ?? donationContext?.donorWalletAddress ?? '',
      fundWalletUrl: getSafeReceiverWalletUrl(),
      amountCents: Number(finalizedContext?.amountCents ?? donationContext?.amountCents ?? 0),
      outgoingPaymentId: outgoingPayment.id ?? '',
    })

    //add to running total
    try {
      console.log(`Added ${Number(donationContext?.amountCents ?? 0)} to running total`);
      await updateRunningTotal(clickhouseClient, donationContext?.userId, Number(donationContext?.amountCents ?? 0));
    } catch (error) {
      logOpenPaymentsError(error);
    }

    const redirectUrl = buildDonationReturnUrl('success', {
      grantId: req.params.uid,
      outgoingPaymentId: outgoingPayment.id ?? '',
    })

    if (!shouldReturnJson(req)) {
      return res.redirect(302, redirectUrl)
    }

    return res.json({ type: 'success', outgoingPayment, redirectUrl })
  } catch (error) {
    logOpenPaymentsError(error)
    await recordDonationEvent({
      donationId: req.params.uid,
      status: 'failed',
      userId: donationContext?.userId ?? '',
      email: donationContext?.email ?? '',
      donorWalletAddress: donationContext?.donorWalletAddress ?? '',
      fundWalletUrl: getSafeReceiverWalletUrl(),
      amountCents: Number(donationContext?.amountCents ?? 0),
      errorMessage: error instanceof Error ? error.message : 'Unable to complete donation',
    })

    const redirectUrl = buildDonationReturnUrl('failed', {
      grantId: req.params.uid,
      error: error instanceof Error ? error.message : 'Unable to complete payment',
    })

    if (!shouldReturnJson(req)) {
      return res.redirect(302, redirectUrl)
    }

    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to complete payment.' })
  }
})

r.get('/payout-approval/:interactionId', async (req, res) => {
  const pending = pendingPayoutGrantInteractions[req.params.interactionId]
  if (!pending) {
    return res.status(404).send('<h1>Payout request not found</h1><p>This payout approval request may already be completed or expired.</p>')
  }

  return res.status(200).type('html').send(renderPayoutApprovalPage(pending, req.params.interactionId))
})

r.get('/payout-reject/:interactionId', async (req, res) => {
  const rejected = await rejectPendingPayoutInteraction(req.params.interactionId)
  if (!rejected) {
    return res.redirect(302, buildDonationReturnUrl('failed', { payout: 'failed', reason: 'Payout request not found' }))
  }

  return res.redirect(
    302,
    buildDonationReturnUrl('failed', {
      payout: 'rejected',
      interactionId: req.params.interactionId,
      eventId: rejected.event?.id ?? '',
      userId: rejected.user?.user_id ?? '',
    })
  )
})

r.get('/complete-payout-grant/:interactionId', async (req, res) => {
  const interactRef = String(req.query.interact_ref ?? '').trim()
  const interactionId = String(req.params.interactionId ?? '').trim()
  const pending = pendingPayoutGrantInteractions[interactionId]

  if (!interactRef) {
    if (!shouldReturnJson(req)) {
      return res.redirect(
        302,
        buildDonationReturnUrl('failed', {
          payout: 'failed',
          interactionId,
          error: 'Missing interact_ref',
        })
      )
    }
    return res.status(400).json({ error: 'interact_ref is required.' })
  }

  if (!pending) {
    if (!shouldReturnJson(req)) {
      return res.redirect(
        302,
        buildDonationReturnUrl('failed', {
          payout: 'failed',
          interactionId,
          error: 'Payout interaction not found',
        })
      )
    }
    return res.status(404).json({ error: 'Payout interaction not found.' })
  }

  try {
    const result = await continuePendingPayoutInteraction(interactionId, interactRef)

    if (result.status === 'pending') {
      if (!shouldReturnJson(req)) {
        return res.redirect(302, result.approvalUrl)
      }
      return res.json({
        success: false,
        pending: true,
        stage: result.stage,
        interactionId: result.interactionId,
        approvalUrl: result.approvalUrl,
        rejectUrl: result.rejectUrl,
      })
    }

    await recordPayoutEvent({
      disasterEventId: result.event?.id ?? '',
      disasterEventTitle: result.event?.title ?? '',
      userId: result.user?.user_id ?? '',
      username: result.user?.username ?? '',
      recipientWalletAddress: result.recipientWalletAddress ?? '',
      amountCents: Number(result.amountCents ?? 0),
      success: true,
      outgoingPaymentId: result.outgoingPayment?.id ?? '',
    })

    console.log('test', result.amountCents);
    await updateRunningTotal(clickhouseClient, result.user?.user_id, Number(-result.amountCents));

    if (!shouldReturnJson(req)) {
      return res.redirect(
        302,
        buildDonationReturnUrl('success', {
          payout: 'success',
          interactionId,
          outgoingPaymentId: result.outgoingPayment?.id ?? '',
        })
      )
    }

    return res.json({
      success: true,
      outgoingPayment: result.outgoingPayment,
    })
  } catch (error) {
    logOpenPaymentsError(error)

    await recordPayoutEvent({
      disasterEventId: pending.event?.id ?? '',
      disasterEventTitle: pending.event?.title ?? '',
      userId: pending.user?.user_id ?? '',
      username: pending.user?.username ?? '',
      recipientWalletAddress: pending.recipientWalletAddress ?? '',
      amountCents: Number(pending.amountCents ?? 0),
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unable to complete payout interaction',
    })

    if (!shouldReturnJson(req)) {
      return res.redirect(
        302,
        buildDonationReturnUrl('failed', {
          payout: 'failed',
          interactionId,
          error: error instanceof Error ? error.message : 'Unable to complete payout interaction',
        })
      )
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to complete payout interaction.',
    })
  }
})

r.get('/payout-pending', async (req, res) => {
  const items = Object.entries(pendingPayoutGrantInteractions)
    .map(([interactionId, pending]) => serializePendingPayoutInteraction(interactionId, pending))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))

  return res.json({
    success: true,
    count: items.length,
    items,
  })
})

r.post('/payout-approve', async (req, res) => {
  const interactionIds = parseInteractionIds(req.body?.interactionIds)
  if (interactionIds.length === 0) {
    return res.status(400).json({ error: 'interactionIds must be a non-empty array.' })
  }

  const results = interactionIds.map((interactionId) => {
    const pending = pendingPayoutGrantInteractions[interactionId]
    if (!pending) {
      return {
        interactionId,
        status: 'not_found',
      }
    }

    return {
      interactionId,
      status: 'pending',
      ...serializePendingPayoutInteraction(interactionId, pending),
    }
  })

  return res.json({
    success: true,
    requestedCount: interactionIds.length,
    pendingCount: results.filter((item) => item.status === 'pending').length,
    notFoundCount: results.filter((item) => item.status === 'not_found').length,
    results,
  })
})

r.post('/payout-reject', async (req, res) => {
  const interactionIds = parseInteractionIds(req.body?.interactionIds)
  if (interactionIds.length === 0) {
    return res.status(400).json({ error: 'interactionIds must be a non-empty array.' })
  }

  const rejectedInteractionIds = []
  const notFoundInteractionIds = []

  for (const interactionId of interactionIds) {
    const rejected = await rejectPendingPayoutInteraction(interactionId)
    if (rejected) {
      rejectedInteractionIds.push(interactionId)
    } else {
      notFoundInteractionIds.push(interactionId)
    }
  }

  return res.json({
    success: true,
    requestedCount: interactionIds.length,
    rejectedCount: rejectedInteractionIds.length,
    notFoundCount: notFoundInteractionIds.length,
    rejectedInteractionIds,
    notFoundInteractionIds,
  })
})

r.post('/disaster-payouts', async (req, res) => {
  const affectedUsers = Array.isArray(req.body?.affectedUsers) ? req.body.affectedUsers : []
  const event = req.body?.event ?? {}

  if (affectedUsers.length === 0) {
    return res.status(400).json({ error: 'affectedUsers is required and must be a non-empty array.' })
  }

  try {
    const payoutSummary = await runDisasterPayouts(affectedUsers, event)
    return res.json({ success: true, event, ...payoutSummary })
  } catch (error) {
    logOpenPaymentsError(error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to run disaster payouts.' })
  }
})

export default r

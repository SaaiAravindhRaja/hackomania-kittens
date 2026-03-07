import { Router } from 'express';
import { loadEnvFile } from 'node:process';
import { isFinalizedGrantWithAccessToken, createAuthenticatedClient } from '@interledger/open-payments'
import { randomUUID } from 'crypto'

try{
    loadEnvFile();
} catch (error) {
    console.log('No .env file found, relying on environment variables');
}

const r = Router();
const user_wallet_url = "https://ilp.interledger-test.dev/nice-donator";

const client = await createAuthenticatedClient({
  keyId: process.env.FUNDMANAGER_KEY_ID,
  privateKey: "private.key",
  walletAddressUrl: "https://ilp.interledger-test.dev/kitten-fundmanager"
});

const globalAssetScale = 2;
const paymentCompleteURI = "http://localhost:8009/payments/complete-payment"
let pendingOutgoingPaymentGrants = {};

const sampleMetaData = {
    externalRef: '#INV2022-8363828',
    description: 'Purchase at Shoe Shop'
};

async function createIncomingPayment(receivingWallet, amount, metadata) {
    //create grant request
    const incomingPaymentGrant = await client.grant.request({ url: receivingWallet.authServer },
    {
        access_token: {
            access: [
                {
                type: 'incoming-payment',
                actions: ['read', 'create']
                },
            ]
        }
    });

    let incomingPayment = await client.incomingPayment.create(
    {
        url: receivingWallet.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
    },
    {
        walletAddress: receivingWallet.id,
        incomingAmount: 
            {
                assetCode: receivingWallet.assetCode,
                assetScale: globalAssetScale,
                value: amount
            },
        metadata: metadata
    });

    return incomingPayment;
}

async function createQuote(receivingWallet, payingWallet, incomingPayment, amount) {
    const quoteGrant = await client.grant.request(
    { url: payingWallet.authServer },
    {
        access_token: {
            access: [
                {
                    type: 'quote',
                    actions: ['create', 'read']
                }
            ]
        }
    });

    const quote = await client.quote.create(
    {
        url: receivingWallet.resourceServer,
        accessToken: quoteGrant.access_token.value
    },
    {
        walletAddress: payingWallet.id,
        receiver: incomingPayment.id,
        method: 'ilp'
    });

    quote.debitAmount.value = amount

    return quote;
}

async function createOutgoingPaymentGrant(payingWallet, quote) {
    const uid = randomUUID();

    const outgoingPaymentGrant = await client.grant.request(
    { url: payingWallet.authServer },
    {
        access_token: {
            access: [{
                type: 'outgoing-payment',
                actions: ['read', 'create', 'list'],
                identifier: payingWallet.id,
                limits: {
                    debitAmount: quote.debitAmount // to authorize an amount up to the quoted amount
                }}]
            },
            interact: {
                start: ['redirect'],
                finish: {
                    method: 'redirect',
                    uri: `${paymentCompleteURI}/${uid}`, // where to redirect the customer after the interaction is completed
                    nonce: randomUUID(),
                }
            }
    });

    return [uid, outgoingPaymentGrant];
}

async function getWallet(url) {
    return await client.walletAddress.get({
        url: url
    })
}

r.get("/pay-single", async(req, res) => {
    let amount = '10000'; //note that amount is in cents
    let metadata = {description: `Incoming donation of $${amount/10**2}`};
    try {
        const donorWallet = await getWallet(user_wallet_url);
        const fundManagerWallet = await getWallet(process.env.RECEIVER_WALLET_ADDRESS_URL);
        console.log(donorWallet, fundManagerWallet);

        const incomingPayment = await createIncomingPayment(fundManagerWallet, amount, metadata);
        const quote = await createQuote(fundManagerWallet, donorWallet, incomingPayment, amount);
        const [id, outgoingPaymentGrant] = await createOutgoingPaymentGrant(donorWallet, quote);
        console.log(id, outgoingPaymentGrant);
        pendingOutgoingPaymentGrants[id] = {outgoingGrant: outgoingPaymentGrant, donorWallet, quote};
        res.redirect(302, outgoingPaymentGrant.interact.redirect);
    } catch (error) {
        res.json(error.stack);
    }

    //res.send("Success");
});

r.get("/complete-payment/:uid", async (req, res) => {
    let interactRef = req.query["interact_ref"];
    let {outgoingGrant, donorWallet, quote} = pendingOutgoingPaymentGrants[req.params.uid];

    try {
        const continueGrantResult = await client.grant.continue(
        {
            url: outgoingGrant.continue.uri,
            accessToken: outgoingGrant.continue.access_token.value
        }, 
        { interact_ref: interactRef });

        if (!isFinalizedGrantWithAccessToken(continueGrantResult)) {
            throw new Error('Expected finalized grant with access token')
        }

        const finalizedOutgoingPaymentGrant = continueGrantResult;

        let outgoingPayment = await client.outgoingPayment.create(
        {
            url: donorWallet.resourceServer,
            accessToken: finalizedOutgoingPaymentGrant.access_token.value
        },
        {
            walletAddress: donorWallet.id,
            quoteId: quote.id,
            metadata: { description: `Donated $${quote.debitAmount.value / 10 ** globalAssetScale} To Kitten Disaster Fund!` }
        });
        res.json({type: "success"});
        console.log(outgoingPayment);

        delete pendingOutgoingPaymentGrants.uid;
    } catch (error) {
        res.json(error);
    }
});

r.get("/pay", async (req, res) => {

});

export default r
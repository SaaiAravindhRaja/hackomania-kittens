import { Router } from 'express';
import { loadEnvFile } from 'node:process';
import { isFinalizedGrantWithAccessToken, createAuthenticatedClient, OpenPaymentsClientError } from '@interledger/open-payments'
import { randomUUID } from 'crypto'

try{
    loadEnvFile();
} catch (error) {
    console.log('No .env file found, relying on environment variables');
}

const r = Router();

const client = await createAuthenticatedClient({
  keyId: process.env.FUNDMANAGER_KEY_ID,
  privateKey: "private.key",
  walletAddressUrl: process.env.WALLET_ADDRESS_URL
});

const globalAssetScale = 2;
const paymentCompleteURI = "http://localhost:8009/payments/complete-single-payment"
let pendingOutgoingPaymentGrants = {};

const sampleMetaData = {
    externalRef: '#INV2022-8363828',
    description: 'Purchase at Shoe Shop'
};

async function createIncomingPayment(receivingWallet, payingWallet, amount, metadata) {
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
    //console.log(typeof(amount), amount);
    let incomingPayment = await client.incomingPayment.create(
    {
        url: receivingWallet.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
    },
    {
        walletAddress: receivingWallet.id,
        metadata: metadata,
        incomingAmount: {
            assetCode: receivingWallet.assetCode,
            assetScale: globalAssetScale,
            value: amount,
        }
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
        method: 'ilp',
        /*
        debit amount not working, unable to add to receiving account
        debitAmount: {
            assetCode: payingWallet.assetCode,
            assetScale: globalAssetScale,
            value: amount,
        }*/
    });

    console.log(quote.debitAmount);

    return quote;
}

async function createOutgoingPaymentGrant(payingWallet, quote, interval = null) {
    const uid = randomUUID();
    let outgoingPaymentGrant;

    if (!interval) {
        outgoingPaymentGrant = await client.grant.request(
        { url: payingWallet.authServer },
        {
            access_token: {
                access: [{
                    type: 'outgoing-payment',
                    actions: ['read', 'create', 'list'],
                    identifier: payingWallet.id,
                    limits: {
                        debitAmount: quote.debitAmount // to authorize an amount up to the quoted amount
                    }
                }]
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
    } else {
        outgoingPaymentGrant = await client.grant.request(
        { url: payingWallet.authServer },
        {
            access_token: {
                access: [{
                    type: 'outgoing-payment',
                    actions: ['read', 'create', 'list'],
                    identifier: payingWallet.id,
                    limits: {
                        debitAmount: quote.debitAmount // to authorize an amount up to the quoted amount
                    },
                    interval: interval
                }]
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
    }

    return [uid, outgoingPaymentGrant];
}

async function getWallet(url) {
    return await client.walletAddress.get({
        url: url
    })
}

r.get("/pay-single", async(req, res) => {
    // changes these to inputs from front end, via post request / add variables to help urself redirect from the final page
    let amount = '10000'; //note that amount is in cents
    const user_wallet_url = "https://ilp.interledger-test.dev/nice-donator";
    // end of things to change
    
    let metadata = {description: `Incoming donation of $${amount/10**2}`};
    try {
        const donorWallet = await getWallet(user_wallet_url);
        const fundManagerWallet = await getWallet(process.env.RECEIVER_WALLET_ADDRESS_URL);
        //console.log(donorWallet, fundManagerWallet);

        const incomingPayment = await createIncomingPayment(fundManagerWallet, donorWallet, amount, metadata);
        const quote = await createQuote(fundManagerWallet, donorWallet, incomingPayment, amount);
        const [id, outgoingPaymentGrant] = await createOutgoingPaymentGrant(donorWallet, quote);
        //console.log(id, outgoingPaymentGrant);
        pendingOutgoingPaymentGrants[id] = {outgoingGrant: outgoingPaymentGrant, donorWallet, quote};
        res.redirect(302, outgoingPaymentGrant.interact.redirect);
    } catch (error) {
        if (error instanceof OpenPaymentsClientError) {
            console.log(error.message)
            console.log(error.description) // additional description of the error
            console.log(error.status) // the HTTP status of the request, if a request failure
            console.log(error.code) // the error code from the Open Payments API
            console.log(error.validationErrors) // an array of validation errors. Populated if the response of the request failed OpenAPI specfication validation, or other validation checks.
            console.log(error.details) // an object containing additional error details
        } else {
            console.log(error)
        }    }
    //res.send("Success");
});

r.get("/complete-single-payment/:uid", async (req, res) => {
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

    //change here to redirect back to our app

    //end of changes
});

/* recurring is not working
    message:    Error making Open Payments POST request
    description:    internal server error
    error status:    500
    error code    request_denied
r.get("/pay", async (req, res) => {
    let amount = '10000'; //note that amount is in cents
    let metadata = {description: `Incoming donation of $${amount/10**2}`};
    let num_recurring_payments = 12;
    let recurring_start_date = new Date();
    const user_wallet_url = "https://ilp.interledger-test.dev/nice-donator";
    const interval_string = `R${num_recurring_payments}/${recurring_start_date.getFullYear()}-${recurring_start_date.getMonth() + 1}-${recurring_start_date.getDate() + 1}T07:18:00/P1M`;
    try {
        const donorWallet = await getWallet(user_wallet_url);
        const fundManagerWallet = await getWallet(process.env.RECEIVER_WALLET_ADDRESS_URL);
        //console.log(donorWallet, fundManagerWallet);

        const incomingPayment = await createIncomingPayment(fundManagerWallet, donorWallet, amount, metadata);
        const quote = await createQuote(fundManagerWallet, donorWallet, incomingPayment, amount);
        const [id, outgoingPaymentGrant] = await createOutgoingPaymentGrant(donorWallet, quote, interval_string);
        //console.log(id, outgoingPaymentGrant);
        pendingOutgoingPaymentGrants[id] = {outgoingGrant: outgoingPaymentGrant, donorWallet, quote};
        res.redirect(302, outgoingPaymentGrant.interact.redirect);
    } catch (error) {
          if (error instanceof OpenPaymentsClientError) {
            console.log(error.message)
            console.log(error.description) // additional description of the error
            console.log(error.status) // the HTTP status of the request, if a request failure
            console.log(error.code) // the error code from the Open Payments API
            console.log(error.validationErrors) // an array of validation errors. Populated if the response of the request failed OpenAPI specfication validation, or other validation checks.
            console.log(error.details) // an object containing additional error details
        } else {
            console.log(error)
        }
    }
    //res.send("Success");
});
*/

export default r
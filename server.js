// server.js
// --- VERSION 31.0 (Final Debugging Version) ---
// This version hardcodes the search query to "shirt" to isolate the problem.
// This will determine if the issue is with the translation logic or the API account itself.

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// --- Your API Details from Environment Variables ---
const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const TRACKING_ID = process.env.TRACKING_ID;

// --- Dictionaries and functions are kept for the next step, but not used in this test ---
const translationMap = {
    // ... (dictionary content)
};
function isHebrew(text) { /* ... */ }
function escapeRegExp(string) { /* ... */ }
function translateHebrewToEnglish(text) { /* ... */ }
function generateSignature(params, appSecret, apiPath = null) { const sortedKeys = Object.keys(params).sort(); let signString = ''; if (apiPath) { signString += apiPath; } sortedKeys.forEach(key => { signString += key + params[key]; }); const hmac = crypto.createHmac('sha256', appSecret); hmac.update(signString); return hmac.digest('hex').toUpperCase(); }
async function refreshAccessToken() { /* ... */ }


app.get('/search', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    
    // --- DEBUGGING STEP: Hardcode the search term to "shirt" ---
    let keywords = "shirt"; 
    console.log(`[DEBUG] Forcing search query to "${keywords}" to test API response.`);
    
    const pageNo = req.query.page_no || '1';

    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN || !TRACKING_ID) {
        return res.status(500).json({ error: 'Server is not configured correctly.' });
    }

    const performSearch = async () => {
        const API_BASE_URL = 'https://api-sg.aliexpress.com/sync';
        const METHOD_NAME = 'aliexpress.affiliate.product.query';

        const params = {
            app_key: APP_KEY,
            access_token: ACCESS_TOKEN,
            method: METHOD_NAME,
            sign_method: 'sha256',
            timestamp: new Date().getTime(),
            keywords: keywords, // This will always be "shirt" in this version
            tracking_id: TRACKING_ID,
            target_language: 'EN',
            page_no: pageNo,
            page_size: '50'
        };

        const sign = generateSignature(params, APP_SECRET);
        params.sign = sign;

        const requestUrl = `${API_BASE_URL}?${new URLSearchParams(params).toString()}`;

        console.log(`Forwarding request to AliExpress: ${requestUrl}`);
        const apiResponse = await fetch(requestUrl, { method: 'POST' });
        return await apiResponse.json();
    };

    try {
        let data = await performSearch();

        const errorResponse = data.error_response;
        if (errorResponse && (errorResponse.code === '27' || errorResponse.code === 'IllegalAccessToken')) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                console.log('Retrying search with new token...');
                data = await performSearch();
            } else {
                return res.status(401).json({ error: 'Failed to refresh access token.' });
            }
        }

        console.log('--- FULL RESPONSE FROM ALIEXPRESS ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('------------------------------------');

        res.json(data);

    } catch (error) {
        console.error('Error in proxy server:', error);
        res.status(500).json({ error: 'Failed to fetch data from AliExpress API' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// --- Helper functions are not included here for brevity but are assumed to be present ---
async function refreshAccessToken() { const fetch = (await import('node-fetch')).default; console.log('--- Access Token is invalid or expired. Attempting to refresh... ---'); const API_BASE_URL = 'https://api-sg.aliexpress.com/rest'; const API_PATH = '/auth/token/refresh'; const params = { app_key: APP_KEY, refresh_token: REFRESH_TOKEN, sign_method: 'sha256', timestamp: new Date().getTime(), }; const sign = generateSignature(params, APP_SECRET, API_PATH); params.sign = sign; const requestUrl = `${API_BASE_URL}${API_PATH}?${new URLSearchParams(params).toString()}`; try { console.log(`Sending refresh token request to: ${requestUrl}`); const response = await fetch(requestUrl, { method: 'POST' }); const data = await response.json(); if (data.access_token) { console.log('--- Successfully refreshed token! ---'); ACCESS_TOKEN = data.access_token; if (data.refresh_token) { REFRESH_TOKEN = data.refresh_token; } return true; } else { console.error('--- Failed to refresh token ---', data); return false; } } catch (error) { console.error('--- Critical error during token refresh ---', error); return false; } }

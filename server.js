// server.js
// --- VERSION 8.1 (Deployment Version with Tracking ID) ---
// This version adds the mandatory 'tracking_id' parameter to all API search calls,
// which is critical for getting relevant affiliate results.

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000; // Render provides the PORT environment variable

app.use(cors());

// --- Reading API details from environment variables ---
// These values MUST be set in the Render dashboard under 'Environment'
const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const TRACKING_ID = process.env.TRACKING_ID; // --- NEW: Reading Tracking ID ---


// --- NEW: Function to detect if a string contains Hebrew characters ---
function isHebrew(text) {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
}

// --- NEW: AI-Powered Translation Function using Gemini API ---
async function translateHebrewToEnglish(text) {
    // If the text is not Hebrew, return it as is.
    if (!isHebrew(text)) {
        return text;
    }
    console.log(`Translating Hebrew text with AI: "${text}"`);

    // A simple and effective prompt for translation
    const prompt = `Translate the following Hebrew search query to a concise English equivalent for an e-commerce site. Return only the translated keywords, nothing else. For example, for "חולצה אדומה יפה לגברים", return "red shirt for men".\n\nHebrew: "${text}"\nEnglish:`;

    const fetch = (await import('node-fetch')).default;
    const geminiApiKey = ""; // This key is provided by the execution environment
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Gemini API request failed with status:", response.status);
            const errorBody = await response.text();
            console.error("Error body:", errorBody);
            return text; // Fallback to original text on failure
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0) {
            const translatedText = result.candidates[0].content.parts[0].text.trim();
            console.log(`Successfully translated to: "${translatedText}"`);
            return translatedText;
        } else {
            console.error("Invalid response structure from Gemini API:", result);
            return text; // Fallback if response is not as expected
        }
    } catch (error) {
        console.error("Error calling Gemini API for translation:", error);
        return text; // Fallback to original text on error
    }
}


// Function to generate the digital signature
function generateSignature(params, appSecret, apiPath = null) {
    const sortedKeys = Object.keys(params).sort();
    let signString = '';
    if (apiPath) {
        signString += apiPath;
    }
    sortedKeys.forEach(key => {
        signString += key + params[key];
    });
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(signString);
    return hmac.digest('hex').toUpperCase();
}

// Function to refresh the Access Token
async function refreshAccessToken() {
    const fetch = (await import('node-fetch')).default;
    console.log('--- Access Token is invalid or expired. Attempting to refresh... ---');
    
    const API_BASE_URL = 'https://api-sg.aliexpress.com/rest';
    const API_PATH = '/auth/token/refresh';

    const params = {
        app_key: APP_KEY,
        refresh_token: REFRESH_TOKEN,
        sign_method: 'sha256',
        timestamp: new Date().getTime(),
    };

    const sign = generateSignature(params, APP_SECRET, API_PATH);
    params.sign = sign;

    const requestUrl = `${API_BASE_URL}${API_PATH}?${new URLSearchParams(params).toString()}`;

    try {
        console.log(`Sending refresh token request to: ${requestUrl}`);
        const response = await fetch(requestUrl, { method: 'POST' });
        const data = await response.json();

        if (data.access_token) {
            console.log('--- Successfully refreshed token! ---');
            ACCESS_TOKEN = data.access_token;
            if (data.refresh_token) {
                REFRESH_TOKEN = data.refresh_token; 
            }
            return true;
        } else {
            console.error('--- Failed to refresh token ---', data);
            return false;
        }
    } catch (error) {
        console.error('--- Critical error during token refresh ---', error);
        return false;
    }
}


app.get('/search', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    let keywords = req.query.keywords;

    if (!keywords) {
        return res.status(400).json({ error: 'Keywords parameter is required' });
    }
    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN || !TRACKING_ID) {
        return res.status(500).json({ error: 'Server is not configured correctly. Please check all environment variables on Render.' });
    }

    // --- AI-Powered Translation Logic ---
    keywords = await translateHebrewToEnglish(keywords);

    const performSearch = async () => {
        const API_BASE_URL = 'https://api-sg.aliexpress.com/sync';
        const METHOD_NAME = 'aliexpress.affiliate.product.query';

        const params = {
            app_key: APP_KEY,
            access_token: ACCESS_TOKEN,
            method: METHOD_NAME,
            sign_method: 'sha256',
            timestamp: new Date().getTime(),
            keywords: keywords, // Use the translated keywords
            tracking_id: TRACKING_ID, // --- NEW: Added tracking_id ---
            target_language: 'EN', // Search in English for best results
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
                return res.status(401).json({ error: 'Failed to refresh access token. The refresh token may have expired. Please re-authorize.' });
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

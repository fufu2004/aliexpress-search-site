// server.js
// --- VERSION 9.1 (Debugging Irrelevant Results) ---
// This version temporarily removes the 'tracking_id' from the search query.
// This is a test to see if the tracking_id is causing the API to return irrelevant results.
// If this works, it indicates an issue with the tracking_id's configuration in the AliExpress portal.

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
const TRACKING_ID = process.env.TRACKING_ID;

// --- NEW: Robust, local translation dictionary ---
const translationMap = {
    'טייץ': 'leggings', 'טייצים': 'leggings',
    'חולצה': 'shirt', 'חולצות': 'shirts', 'חולצת': 'shirt',
    'שמלה': 'dress', 'שמלות': 'dresses',
    'מכנסיים': 'pants', 'מכנס': 'pants',
    'גינס': 'jeans',
    'נעליים': 'shoes', 'נעל': 'shoe',
    'ספורט': 'sport',
    'סניקרס': 'sneakers',
    'מגפיים': 'boots', 'מגף': 'boot',
    'אוזניות': 'headphones',
    'אלחוטיות': 'wireless', 'אלחוטי': 'wireless',
    'רחפן': 'drone',
    'שעון': 'watch',
    'חכם': 'smart', 'חכמה': 'smart',
    'תיק': 'bag', 'תיקים': 'bags',
    'גב': 'back',
    'ארנק': 'wallet',
    'אדום': 'red', 'אדומה': 'red',
    'כחול': 'blue', 'כחולה': 'blue',
    'ירוק': 'green', 'ירוקה': 'green',
    'שחור': 'black', 'שחורה': 'black',
    'לבן': 'white', 'לבנה': 'white',
    'ורוד': 'pink', 'ורודה': 'pink',
    'צהוב': 'yellow', 'צהובה': 'yellow',
    'גברים': 'men', 'לגבר': 'men',
    'נשים': 'women', 'לאישה': 'women',
    'ילדים': 'kids', 'ילד': 'boy', 'ילדה': 'girl'
};

// Function to detect if a string contains Hebrew characters
function isHebrew(text) {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
}

// --- NEW: Improved Local Translation Function ---
function translateHebrewToEnglish(text) {
    if (!isHebrew(text)) {
        return text;
    }
    console.log(`Translating Hebrew query with internal dictionary: "${text}"`);
    const words = text.split(/\s+/); // Split by one or more spaces
    const translatedWords = words
        .map(word => translationMap[word.trim().toLowerCase()])
        .filter(Boolean); // Translate known words and remove any that are not in the dictionary

    if (translatedWords.length > 0) {
        const finalQuery = translatedWords.join(' ');
        console.log(`Successfully translated to: "${finalQuery}"`);
        return finalQuery;
    } else {
        console.log(`No translatable keywords found in "${text}", using original query.`);
        return text; // Fallback to the original query if no words were translated
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
    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN) {
        return res.status(500).json({ error: 'Server is not configured correctly. Please check environment variables on Render.' });
    }

    // --- Using the new, reliable local translation ---
    keywords = translateHebrewToEnglish(keywords);

    const performSearch = async () => {
        const API_BASE_URL = 'https://api-sg.aliexpress.com/sync';
        const METHOD_NAME = 'aliexpress.affiliate.product.query';

        const params = {
            app_key: APP_KEY,
            access_token: ACCESS_TOKEN,
            method: METHOD_NAME,
            sign_method: 'sha256',
            timestamp: new Date().getTime(),
            keywords: keywords,
            // tracking_id: TRACKING_ID, // <-- Temporarily removed for debugging
            target_language: 'EN',
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


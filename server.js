// server.js
// --- VERSION 10.1 (Final Local Version) ---
// This version contains the new, valid tokens and all the latest features,
// including a more robust local translation dictionary that handles punctuation.

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(cors());

// --- Your API Details (UPDATED with latest keys) ---
const APP_KEY = '517514';
const APP_SECRET = 'ikwGsyb4mcavt2EaiDLSwmohxFfX0AUN';
const TRACKING_ID = 'fufu2004';

// --- NEW VALID TOKENS ---
let ACCESS_TOKEN = '50000501234qsnZxgvELth0OH7CBxiNu1hImSgXeztmD1B1cca3313ovaRqpjBT0MJYi';
let REFRESH_TOKEN = '50001500a34Og47gApXQthhYKUDIxEUrkbEjy3Ms2dIEOj1dd97a83vkq0BWqYVt1YY2';


// --- Robust, local translation dictionary ---
const translationMap = {
    'אוזניות אלחוטיות': 'wireless headphones',
    'חולצת טריקו': 't-shirt',
    'נעלי ספורט': 'sneakers',
    'שעון חכם': 'smartwatch',
    'תיק גב': 'backpack',
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

// Improved Local Translation Function
function translateHebrewToEnglish(text) {
    if (!isHebrew(text)) {
        return text;
    }
    console.log(`Translating Hebrew query with internal dictionary: "${text}"`);
    // --- IMPROVEMENT: Remove common punctuation before splitting ---
    const words = text.replace(/[.,!?;:"']/g, '').split(/\s+/);
    const translatedWords = words
        .map(word => translationMap[word.trim().toLowerCase()])
        .filter(Boolean);

    if (translatedWords.length > 0) {
        const finalQuery = translatedWords.join(' ');
        console.log(`Successfully translated to: "${finalQuery}"`);
        return finalQuery;
    } else {
        console.log(`No translatable keywords found in "${text}", using original query.`);
        return text;
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
            tracking_id: TRACKING_ID,
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
    console.log(`Proxy server listening at http://localhost:${port}`);
});


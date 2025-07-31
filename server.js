// server.js
// --- VERSION 9.3 (With Google Translate fallback) ---

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const TRACKING_ID = process.env.TRACKING_ID;

const translationMap = {
    'טייץ': 'leggings', 'טייצים': 'leggings',
    'חולצה': 'shirt', 'חולצות': 'shirts',
    'שמלה': 'dress', 'שמלות': 'dresses',
    'מכנסיים': 'pants', 'מכנס': 'pants',
    'גינס': 'jeans',
    'נעליים': 'shoes', 'נעל': 'shoe',
    'ספורט': 'sport',
    'סניקרס': 'sneakers',
    'מגפיים': 'boots', 'מגף': 'boot',
    'אוזניות': 'headphones',
    'אלחוטיות': 'wireless',
    'רחפן': 'drone',
    'שעון': 'watch',
    'חכם': 'smart',
    'תיק': 'bag', 'תיקים': 'bags',
    'גב': 'back',
    'ארנק': 'wallet',
    'אדום': 'red', 'כחול': 'blue', 'ירוק': 'green', 'שחור': 'black', 'לבן': 'white',
    'ורוד': 'pink', 'צהוב': 'yellow',
    'גברים': 'men', 'נשים': 'women', 'ילדים': 'kids'
};

function isHebrew(text) {
    return /[\u0590-\u05FF]/.test(text);
}

async function googleTranslate(text) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    try {
        const res = await fetch(url);
        const json = await res.json();
        return json[0].map(x => x[0]).join('');
    } catch (e) {
        console.error('Google Translate failed:', e);
        return text;
    }
}

async function translateHebrewToEnglish(text) {
    if (!isHebrew(text)) return text;
    const words = text.split(/\s+/).map(w => translationMap[w.trim().toLowerCase()] || w);
    const joined = words.join(' ');
    if (joined === text) {
        console.log('Fallback to Google Translate');
        return await googleTranslate(text);
    }
    return joined;
}

function generateSignature(params, appSecret, apiPath = null) {
    const sortedKeys = Object.keys(params).sort();
    let signString = apiPath || '';
    sortedKeys.forEach(key => { signString += key + params[key]; });
    return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase();
}

async function refreshAccessToken() {
    console.log('Refreshing token...');
    const API_PATH = '/auth/token/refresh';
    const API_BASE_URL = 'https://api-sg.aliexpress.com/rest';
    const params = {
        app_key: APP_KEY,
        refresh_token: REFRESH_TOKEN,
        sign_method: 'sha256',
        timestamp: new Date().getTime(),
    };
    const sign = generateSignature(params, APP_SECRET, API_PATH);
    params.sign = sign;
    const url = `${API_BASE_URL}${API_PATH}?${new URLSearchParams(params)}`;
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    if (data.access_token) {
        ACCESS_TOKEN = data.access_token;
        REFRESH_TOKEN = data.refresh_token;
        return true;
    }
    return false;
}

app.get('/search', async (req, res) => {
    let keywords = req.query.keywords;
    if (!keywords) return res.status(400).json({ error: 'Missing keywords' });
    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN) return res.status(500).json({ error: 'Missing API credentials' });

    keywords = await translateHebrewToEnglish(keywords);

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

    let data = await fetch(`${API_BASE_URL}?${new URLSearchParams(params)}`, { method: 'POST' }).then(res => res.json());
    if (data.error_response && (data.error_response.code === '27' || data.error_response.code === 'IllegalAccessToken')) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            params.access_token = ACCESS_TOKEN;
            params.sign = generateSignature(params, APP_SECRET);
            data = await fetch(`${API_BASE_URL}?${new URLSearchParams(params)}`, { method: 'POST' }).then(res => res.json());
        } else {
            return res.status(401).json({ error: 'Failed to refresh access token' });
        }
    }
    res.json(data);
});

app.listen(port, () => console.log(`Server running on port ${port}`));

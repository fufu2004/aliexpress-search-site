// server.js
// --- VERSION 9.3 (Google Translate fallback enabled) ---

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { translate } = require('@vitalets/google-translate-api');

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

function isHebrew(text) {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
}

async function translateHebrewToEnglish(text) {
    if (!isHebrew(text)) return text;
    console.log(`🔠 תרגום פנימי: "${text}"`);
    const words = text.split(/\s+/);
    const translatedWords = words
        .map(word => translationMap[word.trim().toLowerCase()])
        .filter(Boolean);

    if (translatedWords.length > 0) {
        const finalQuery = translatedWords.join(' ');
        console.log(`✅ תרגום הצליח: "${finalQuery}"`);
        return finalQuery;
    } else {
        console.log(`⚠️ אין התאמה במילון – מנסה תרגום אוטומטי דרך Google Translate`);
        try {
            const result = await translate(text, { from: 'he', to: 'en' });
            console.log(`🟢 תרגום גוגל: "${result.text}"`);
            return result.text;
        } catch (err) {
            console.error('❌ תרגום Google נכשל:', err);
            return text;
        }
    }
}

function generateSignature(params, appSecret, apiPath = null) {
    const sortedKeys = Object.keys(params).sort();
    let signString = '';
    if (apiPath) signString += apiPath;
    sortedKeys.forEach(key => { signString += key + params[key]; });
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(signString);
    return hmac.digest('hex').toUpperCase();
}

async function refreshAccessToken() {
    const fetch = (await import('node-fetch')).default;
    const API_BASE_URL = 'https://api-sg.aliexpress.com/rest';
    const API_PATH = '/auth/token/refresh';

    const params = {
        app_key: APP_KEY,
        refresh_token: REFRESH_TOKEN,
        sign_method: 'sha256',
        timestamp: new Date().getTime(),
    };

    params.sign = generateSignature(params, APP_SECRET, API_PATH);

    const requestUrl = `${API_BASE_URL}${API_PATH}?${new URLSearchParams(params).toString()}`;
    const response = await fetch(requestUrl, { method: 'POST' });
    const data = await response.json();

    if (data.access_token) {
        ACCESS_TOKEN = data.access_token;
        if (data.refresh_token) REFRESH_TOKEN = data.refresh_token;
        return true;
    }
    return false;
}

app.get('/search', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    let keywords = req.query.keywords;
    if (!keywords) return res.status(400).json({ error: 'Keywords parameter is required' });
    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN) {
        return res.status(500).json({ error: 'Server not configured properly' });
    }

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
            keywords: keywords,
            tracking_id: TRACKING_ID,
            target_language: 'EN',
        };

        params.sign = generateSignature(params, APP_SECRET);

        const requestUrl = `${API_BASE_URL}?${new URLSearchParams(params).toString()}`;
        const apiResponse = await fetch(requestUrl, { method: 'POST' });
        return await apiResponse.json();
    };

    try {
        let data = await performSearch();

        const errorResponse = data.error_response;
        if (errorResponse && (errorResponse.code === '27' || errorResponse.code === 'IllegalAccessToken')) {
            const refreshed = await refreshAccessToken();
            if (refreshed) data = await performSearch();
            else return res.status(401).json({ error: 'Token refresh failed' });
        }

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: 'AliExpress API error', details: error });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

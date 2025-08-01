// server.js
// --- VERSION 20.0 (Final Version with Advanced Dictionary Translation) ---
// This version uses an advanced internal dictionary to parse and translate
// full Hebrew sentences, ensuring stable and accurate search results.

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

// --- Comprehensive, local translation dictionary ---
const translationMap = {
    'אוזניות אלחוטיות': 'wireless headphones',
    'לא שקוף': 'non see-through',
    'עמיד למים': 'waterproof',
    'עם כיסים': 'with pockets',
    'חולצת טריקו': 't-shirt',
    'נעלי ספורט': 'sneakers',
    'שעון חכם': 'smartwatch',
    'תיק גב': 'backpack',
    'טייץ': 'leggings', 'טייצים': 'leggings',
    'חולצה': 'shirt', 'חולצות': 'shirts', 'חולצת': 'shirt',
    'שמלה': 'dress', 'שמלות': 'dresses',
    'מכנסיים': 'pants', 'מכנס': 'pants',
    'גינס': 'jeans', 'ג\'ינס': 'jeans',
    'זקט': 'jacket', 'ג\'קט': 'jacket', 'ג\'קטים': 'jackets',
    'מעיל': 'coat', 'סוודר': 'sweater', 'חליפה': 'suit', 'חצאית': 'skirt', 'בגד ים': 'swimsuit',
    'נעליים': 'shoes', 'נעל': 'shoe',
    'ספורט': 'sport', 'אימון': 'workout', 'אימונים': 'workout',
    'יוגה': 'yoga',
    'סניקרס': 'sneakers',
    'מגפיים': 'boots', 'מגף': 'boot', 'סנדלים': 'sandals',
    'אוזניות': 'headphones',
    'אלחוטיות': 'wireless', 'אלחוטי': 'wireless',
    'רחפן': 'drone', 'שעון': 'watch', 'טלפון': 'phone', 'כיסוי': 'case', 'מטען': 'charger', 'מצלמה': 'camera',
    'חכם': 'smart', 'חכמה': 'smart',
    'תיק': 'bag', 'תיקים': 'bags', 'גב': 'back', 'ארנק': 'wallet', 'כובע': 'hat', 'כובעים': 'hats', 'משקפי שמש': 'sunglasses',
    'תכשיטים': 'jewelry', 'שרשרת': 'necklace', 'צמיד': 'bracelet',
    'אדום': 'red', 'אדומה': 'red', 'כחול': 'blue', 'כחולה': 'blue', 'ירוק': 'green', 'ירוקה': 'green', 'שחור': 'black', 'שחורה': 'black',
    'לבן': 'white', 'לבנה': 'white', 'ורוד': 'pink', 'ורודה': 'pink', 'צהוב': 'yellow', 'צהובה': 'yellow', 'כתום': 'orange', 'כתומה': 'orange',
    'סגול': 'purple', 'סגולה': 'purple', 'אפור': 'gray', 'אפורה': 'gray', 'אפורים': 'gray',
    'גברים': 'men', 'לגבר': 'men', 'נשים': 'women', 'לאישה': 'women', 'ילדים': 'kids', 'ילד': 'boy', 'ילדה': 'girl', 'תינוק': 'baby', 'תינוקות': 'baby',
    'נוח': 'comfortable', 'נוחה': 'comfortable'
};

// Function to detect if a string contains Hebrew characters
function isHebrew(text) {
    if (!text) return false;
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
}

// Advanced Local Translation Function
function translateHebrewToEnglish(text) {
    if (!isHebrew(text)) {
        return text;
    }
    console.log(`Translating Hebrew query with smart dictionary: "${text}"`);
    let translatedText = text.replace(/[.,!?;:"']/g, ''); // Clean punctuation

    // Get keys sorted by length, descending, to match longer phrases first
    const sortedKeys = Object.keys(translationMap).sort((a, b) => b.length - a.length);

    for (const hebrewTerm of sortedKeys) {
        const regex = new RegExp(hebrewTerm, "g");
        translatedText = translatedText.replace(regex, translationMap[hebrewTerm]);
    }
    
    // Remove any remaining Hebrew words and extra spaces
    const finalWords = translatedText.split(/\s+/).filter(word => !isHebrew(word) && word.length > 0);

    if (finalWords.length > 0) {
        const finalQuery = finalWords.join(' ');
        console.log(`Successfully translated to: "${finalQuery}"`);
        return finalQuery;
    } else {
        console.log(`No translatable keywords found in "${text}", using original query.`);
        return text; // Fallback to the original query if nothing could be translated
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
    console.log(`Server listening on port ${port}`);
});

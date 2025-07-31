// server.js
// --- VERSION 9.3 ---

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Translate } = require('@google-cloud/translate').v2;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const TRACKING_ID = process.env.TRACKING_ID;

// GOOGLE TRANSLATE CLIENT
const translator = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  key: process.env.GOOGLE_API_KEY
});

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
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
}

async function translateHebrewToEnglish(text) {
  if (!isHebrew(text)) return text;

  const words = text.split(/\s+/);
  const translatedWords = words.map(w => translationMap[w.trim().toLowerCase()]).filter(Boolean);

  if (translatedWords.length > 0) {
    return translatedWords.join(' ');
  } else {
    try {
      const [translated] = await translator.translate(text, 'en');
      return translated;
    } catch (err) {
      console.error('Google Translate failed:', err);
      return text;
    }
  }
}

function generateSignature(params, appSecret, apiPath = null) {
  const sortedKeys = Object.keys(params).sort();
  let signString = apiPath || '';
  sortedKeys.forEach(key => {
    signString += key + params[key];
  });
  return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase();
}

async function refreshAccessToken() {
  const fetch = (await import('node-fetch')).default;
  const API_BASE_URL = 'https://api-sg.aliexpress.com/rest';
  const API_PATH = '/auth/token/refresh';

  const params = {
    app_key: APP_KEY,
    refresh_token: REFRESH_TOKEN,
    sign_method: 'sha256',
    timestamp: Date.now(),
  };
  params.sign = generateSignature(params, APP_SECRET, API_PATH);

  const requestUrl = `${API_BASE_URL}${API_PATH}?${new URLSearchParams(params)}`;
  const response = await fetch(requestUrl, { method: 'POST' });
  const data = await response.json();

  if (data.access_token) {
    ACCESS_TOKEN = data.access_token;
    if (data.refresh_token) REFRESH_TOKEN = data.refresh_token;
    return true;
  }
  return false;
}

function filterResultsByKeyword(products, keyword) {
  const key = keyword.toLowerCase();
  return products.filter(item => {
    const info = item.ae_item_info || {};
    return (
      info.en_title?.toLowerCase().includes(key) ||
      info.product_category?.toLowerCase().includes(key)
    );
  });
}

app.get('/search', async (req, res) => {
  const fetch = (await import('node-fetch')).default;
  let keywords = req.query.keywords;

  if (!keywords) return res.status(400).json({ error: 'Keywords required' });
  if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN) return res.status(500).json({ error: 'Missing environment variables' });

  const translated = await translateHebrewToEnglish(keywords);

  const performSearch = async () => {
    const API_BASE_URL = 'https://api-sg.aliexpress.com/sync';
    const METHOD_NAME = 'aliexpress.affiliate.product.query';
    const params = {
      app_key: APP_KEY,
      access_token: ACCESS_TOKEN,
      method: METHOD_NAME,
      sign_method: 'sha256',
      timestamp: Date.now(),
      keywords: translated,
      tracking_id: TRACKING_ID,
      target_language: 'EN',
    };
    params.sign = generateSignature(params, APP_SECRET);
    const requestUrl = `${API_BASE_URL}?${new URLSearchParams(params)}`;
    const response = await fetch(requestUrl, { method: 'POST' });
    return await response.json();
  };

  try {
    let data = await performSearch();
    if (data.error_response && (data.error_response.code === '27' || data.error_response.code === 'IllegalAccessToken')) {
      if (await refreshAccessToken()) data = await performSearch();
      else return res.status(401).json({ error: 'Failed to refresh access token.' });
    }

    let items = data.result?.result?.result_list?.map(r => r.result) || [];
    const filtered = filterResultsByKeyword(items, translated);

    res.json({ original: items, filtered });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'AliExpress fetch failed' });
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));

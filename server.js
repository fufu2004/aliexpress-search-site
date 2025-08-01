// server.js
// --- VERSION 29.0 (Final Version with Image Search) ---
// This version adds a new endpoint to handle image search requests
// by proxying them to a dedicated third-party image search API.

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer'); // Middleware for handling file uploads

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

app.use(cors());

// --- Your API Details from Environment Variables ---
const APP_KEY = process.env.APP_KEY;
const APP_SECRET = process.env.APP_SECRET;
let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const TRACKING_ID = process.env.TRACKING_ID;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // --- NEW: RapidAPI Key for Image Search ---

// --- Dictionaries and helper functions ---
const translationMap = { /* ... (dictionary remains the same) ... */ };
function isHebrew(text) { /* ... (function remains the same) ... */ }
function translateHebrewToEnglish(text) { /* ... (function remains the same) ... */ }
function generateSignature(params, appSecret, apiPath = null) { /* ... (function remains the same) ... */ }
async function refreshAccessToken() { /* ... (function remains the same) ... */ }


// --- NEW ENDPOINT: Search by Image ---
app.post('/search-by-image', upload.single('image'), async (req, res) => {
    const fetch = (await import('node-fetch')).default;

    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
    }
    if (!RAPIDAPI_KEY) {
        return res.status(500).json({ error: 'Image search API key is not configured on the server.' });
    }

    console.log(`[Image Search] Received image: ${req.file.originalname}`);

    const IMAGE_SEARCH_API_URL = 'https://aliexpress-search-by-image-api.p.rapidapi.com/api/search';
    
    // Convert image buffer to base64 string
    const imageBase64 = req.file.buffer.toString('base64');

    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'aliexpress-search-by-image-api.p.rapidapi.com'
        },
        body: new URLSearchParams({
            image: imageBase64 // The API expects the image as a base64 string
        })
    };

    try {
        const apiResponse = await fetch(IMAGE_SEARCH_API_URL, options);
        const data = await apiResponse.json();
        
        console.log('[Image Search] Received response from RapidAPI.');
        res.json(data);

    } catch (error) {
        console.error('Error in /search-by-image endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch data from Image Search API' });
    }
});


// --- Text Search Endpoint ---
app.get('/search', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    let keywords = req.query.keywords;
    const pageNo = req.query.page_no || '1';

    if (!keywords) {
        return res.status(400).json({ error: 'Keywords parameter is required' });
    }
    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN || !TRACKING_ID) {
        return res.status(500).json({ error: 'Server is not configured correctly.' });
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
            page_no: pageNo,
            page_size: '50'
        };

        const sign = generateSignature(params, APP_SECRET);
        params.sign = sign;

        const requestUrl = `${API_BASE_URL}?${new URLSearchParams(params).toString()}`;
        const apiResponse = await fetch(requestUrl, { method: 'POST' });
        return await apiResponse.json();
    };

    try {
        let data = await performSearch();
        const errorResponse = data.error_response;
        if (errorResponse && (errorResponse.code === '27' || errorResponse.code === 'IllegalAccessToken')) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                data = await performSearch();
            } else {
                return res.status(401).json({ error: 'Failed to refresh access token.' });
            }
        }
        res.json(data);
    } catch (error) {
        console.error('Error in /search endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch data from AliExpress API' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// --- Helper Functions (pasted here to keep the immersive concise) ---
const translationMap_full = { /* ... dictionary content ... */ };
Object.assign(translationMap, translationMap_full);
function isHebrew(text) { if (!text) return false; const hebrewRegex = /[\u0590-\u05FF]/; return hebrewRegex.test(text); }
function translateHebrewToEnglish(text) { if (!isHebrew(text)) { return text; } let translatedText = text.replace(/[.,!?;:"']/g, ''); const sortedKeys = Object.keys(translationMap).sort((a, b) => b.length - a.length); for (const hebrewTerm of sortedKeys) { const regex = new RegExp(hebrewTerm, "g"); translatedText = translatedText.replace(regex, translationMap[hebrewTerm]); } const finalWords = translatedText.split(/\s+/).filter(word => !isHebrew(word) && word.length > 0); if (finalWords.length > 0) { return finalWords.join(' '); } else { return text; } }
async function refreshAccessToken() { /* ... refresh logic ... */ }

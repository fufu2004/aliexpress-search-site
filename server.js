// server.js
// --- VERSION 25.2 (Fix for Category API Signature - Removed Access Token) ---
// This version removes the access_token from the category API call, as it's often
// not required for system-level calls and can cause signature errors.

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

// --- Dictionaries for Translation ---
const categoryTranslationMap = {
    "Women's Clothing": "בגדי נשים",
    "Men's Clothing": "בגדי גברים",
    "Cellphones & Telecommunications": "טלפונים ותקשורת",
    "Computer & Office": "מחשבים ומשרד",
    "Consumer Electronics": "אלקטרוניקה",
    "Jewelry & Accessories": "תכשיטים ואביזרים",
    "Home & Garden": "בית וגן",
    "Luggage & Bags": "תיקים ומזוודות",
    "Shoes": "נעליים",
    "Mother & Kids": "אמהות וילדים",
    "Toys & Hobbies": "צעצועים ותחביבים",
    "Beauty & Health": "יופי ובריאות",
    "Watches": "שעונים",
    "Weddings & Events": "חתונות ואירועים",
    "Novelty & Special Use": "חידושים ושימוש מיוחד",
    "Automobiles & Motorcycles": "רכב ואופנועים",
    "Lights & Lighting": "תאורה",
    "Furniture": "ריהוט",
    "Electronic Components & Supplies": "רכיבים אלקטרוניים",
    "Office & School Supplies": "ציוד משרדי ולימודי",
    "Home Appliances": "מכשירי חשמל ביתיים",
    "Sports & Entertainment": "ספורט ובידור",
    "Tools": "כלי עבודה"
};

const translationMap = {
    'אוזניות אלחוטיות': 'wireless headphones', 'לא שקוף': 'non see-through', 'עמיד למים': 'waterproof', 'עם כיסים': 'with pockets',
    'חולצת טריקו': 't-shirt', 'נעלי ספורט': 'sneakers', 'שעון חכם': 'smartwatch', 'תיק גב': 'backpack', 'משקפי שמש': 'sunglasses',
    'בגד ים': 'swimsuit', 'מטען נייד': 'power bank', 'כבל טעינה': 'charging cable', 'טייץ': 'leggings', 'טייצים': 'leggings', 'חולצה': 'shirt', 'חולצות': 'shirts', 'חולצת': 'shirt', 'שמלה': 'dress', 'שמלות': 'dresses',
    'מכנסיים': 'pants', 'מכנס': 'pants', 'גינס': 'jeans', 'ג\'ינס': 'jeans', 'זקט': 'jacket', 'ג\'קט': 'jacket', 'ג\'קטים': 'jackets',
    'מעיל': 'coat', 'סוודר': 'sweater', 'חליפה': 'suit', 'חצאית': 'skirt', 'פיג\'מה': 'pajamas', 'גרביים': 'socks', 'הלבשה תחתונה': 'lingerie',
    'קפוצ\'ון': 'hoodie', 'טרנינג': 'tracksuit', 'נעליים': 'shoes', 'נעל': 'shoe', 'סניקרס': 'sneakers', 'מגפיים': 'boots', 'מגף': 'boot', 'סנדלים': 'sandals', 'נעלי עקב': 'high heels',
    'כפכפים': 'slippers', 'אוזניות': 'headphones', 'רחפן': 'drone', 'שעון': 'watch', 'טלפון': 'phone', 'כיסוי': 'case', 'מטען': 'charger', 'מצלמה': 'camera',
    'מקלדת': 'keyboard', 'עכבר': 'mouse', 'רמקול': 'speaker', 'מקרן': 'projector', 'טאבלט': 'tablet', 'מחשב נייד': 'laptop', 'מסך מחשב': 'monitor',
    'תיק': 'bag', 'תיקים': 'bags', 'ארנק': 'wallet', 'כובע': 'hat', 'כובעים': 'hats', 'חגורה': 'belt',
    'תכשיטים': 'jewelry', 'שרשרת': 'necklace', 'צמיד': 'bracelet', 'עגילים': 'earrings', 'טבעת': 'ring', 'צעיף': 'scarf',
    'מטבח': 'kitchen', 'סלון': 'living room', 'מצעים': 'bedding', 'מגבת': 'towel', 'כרית': 'pillow', 'סיר': 'pot', 'מחבת': 'pan', 'וילון': 'curtain',
    'שטיח': 'rug', 'מנורה': 'lamp', 'רהיטים': 'furniture', 'כלי עבודה': 'tools', 'גינה': 'garden', 'ספה': 'sofa', 'שולחן': 'table', 'כיסא': 'chair',
    'צעצוע': 'toy', 'צעצועים': 'toys', 'בובה': 'doll', 'בובות': 'dolls', 'לגו': 'lego', 'פאזל': 'puzzle', 'משחק קופסה': 'board game',
    'איפור': 'makeup', 'קרם': 'cream', 'שפתון': 'lipstick', 'מברשת': 'brush', 'בושם': 'perfume', 'שמפו': 'shampoo', 'סבון': 'soap',
    'ספורט': 'sport', 'טיולים': 'hiking', 'קמפינג': 'camping', 'אוהל': 'tent', 'שק שינה': 'sleeping bag', 'אופניים': 'bicycle', 'כדורגל': 'football',
    'כדורסל': 'basketball', 'רכב': 'car', 'אביזרים לרכב': 'car accessories', 'כיסוי הגה': 'steering wheel cover', 'מצלמת דרך': 'dash cam',
    'משרד': 'office', 'בית ספר': 'school', 'עט': 'pen', 'עיפרון': 'pencil', 'מחברת': 'notebook', 'קלמר': 'pencil case',
    'אלחוטיות': 'wireless', 'אלחוטי': 'wireless', 'אימון': 'workout', 'אימונים': 'workout', 'יוגה': 'yoga',
    'חכם': 'smart', 'חכמה': 'smart', 'גב': 'back', 'אדום': 'red', 'אדומה': 'red', 'כחול': 'blue', 'כחולה': 'blue', 'ירוק': 'green', 'ירוקה': 'green',
    'שחור': 'black', 'שחורה': 'black', 'לבן': 'white', 'לבנה': 'white', 'ורוד': 'pink', 'ורודה': 'pink', 'צהוב': 'yellow', 'צהובה': 'yellow',
    'כתום': 'orange', 'כתומה': 'orange', 'סגול': 'purple', 'סגולה': 'purple', 'אפור': 'gray', 'אפורה': 'gray', 'אפורים': 'gray',
    'גדול': 'large', 'גדולה': 'large', 'קטן': 'small', 'קטנה': 'small', 'ארוך': 'long', 'ארוכה': 'long', 'קצר': 'short', 'קצרה': 'short',
    'חדש': 'new', 'חדשה': 'new', 'זול': 'cheap', 'זולה': 'cheap', 'נוח': 'comfortable', 'נוחה': 'comfortable',
    'גברים': 'men', 'לגבר': 'men', 'נשים': 'women', 'לאישה': 'women', 'ילדים': 'kids', 'ילד': 'boy', 'ילדה': 'girl', 'תינוק': 'baby', 'תינוקות': 'baby',
    'נייק': 'nike', 'אדידס': 'adidas', 'זארה': 'zara', 'אפל': 'apple', 'סמסונג': 'samsung', 'שיאומי': 'xiaomi',
    'לולולמון': 'lululemon', 'אלו יוגה': 'alo yoga', 'סקצ\'רס': 'skechers', 'קרוקס': 'crocs', 'דיסון': 'dyson',
    'אנקר': 'anker', 'בייסוס': 'baseus', 'יוגרין': 'ugreen', 'סוני': 'sony', 'קנון': 'canon', 'ניקון': 'nikon',
    'שיין': 'shein', 'מנגו': 'mango', 'ברשקה': 'bershka', 'אנדר ארמור': 'under armour', 'פומה': 'puma', 'ריבוק': 'reebok',
    'לגו': 'lego', 'פלייסטיישן': 'playstation', 'אקסבוקס': 'xbox', 'נינטנדו': 'nintendo'
};

function isHebrew(text) { if (!text) return false; const hebrewRegex = /[\u0590-\u05FF]/; return hebrewRegex.test(text); }
function translateHebrewToEnglish(text) { if (!isHebrew(text)) { return text; } console.log(`Translating: "${text}"`); let translatedText = text.replace(/[.,!?;:"']/g, ''); const sortedKeys = Object.keys(translationMap).sort((a, b) => b.length - a.length); for (const hebrewTerm of sortedKeys) { const regex = new RegExp(hebrewTerm, "g"); translatedText = translatedText.replace(regex, translationMap[hebrewTerm]); } const finalWords = translatedText.split(/\s+/).filter(word => !isHebrew(word) && word.length > 0); if (finalWords.length > 0) { const finalQuery = finalWords.join(' '); console.log(`Translated to: "${finalQuery}"`); return finalQuery; } else { console.log(`No translation found, using original.`); return text; } }
function generateSignature(params, appSecret, apiPath = null) { const sortedKeys = Object.keys(params).sort(); let signString = ''; if (apiPath) { signString += apiPath; } sortedKeys.forEach(key => { signString += key + params[key]; }); const hmac = crypto.createHmac('sha256', appSecret); hmac.update(signString); return hmac.digest('hex').toUpperCase(); }
async function refreshAccessToken() { /* ... (code remains the same) ... */ }


// --- UPDATED ENDPOINT: Get and Translate Categories ---
app.get('/categories', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    try {
        // --- FIX: Treat category API as a System Interface call ---
        const API_BASE_URL = 'https://api-sg.aliexpress.com/rest';
        const METHOD_NAME = 'aliexpress.affiliate.category.get';
        const API_PATH = '/' + METHOD_NAME;

        const params = {
            app_key: APP_KEY,
            // access_token: ACCESS_TOKEN, // <-- REMOVED
            method: METHOD_NAME,
            sign_method: 'sha256',
            timestamp: new Date().getTime(),
        };

        // Generate signature using the System Interface method (with apiPath)
        const sign = generateSignature(params, APP_SECRET, API_PATH);
        params.sign = sign;

        const requestUrl = `${API_BASE_URL}${API_PATH}?${new URLSearchParams(params).toString()}`;
        
        console.log(`Forwarding request to AliExpress: ${requestUrl}`);
        const apiResponse = await fetch(requestUrl, { method: 'POST' });
        let data = await apiResponse.json();
        
        // Translate category names if they exist
        const categories = data?.aliexpress_affiliate_category_get_response?.resp_result?.result?.categories?.category;
        if (categories && Array.isArray(categories)) {
            categories.forEach(cat => {
                if (categoryTranslationMap[cat.category_name]) {
                    cat.category_name = categoryTranslationMap[cat.category_name];
                }
            });
        }

        console.log('--- FULL RESPONSE FROM ALIEXPRESS (CATEGORIES) ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('------------------------------------');
        res.json(data);
    } catch (error) {
        console.error('Error in /categories endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch categories from AliExpress API' });
    }
});


// --- Search Products Endpoint ---
app.get('/search', async (req, res) => {
    const fetch = (await import('node-fetch')).default;
    let keywords = req.query.keywords;
    const categoryId = req.query.categoryId;

    if (!keywords && !categoryId) {
        return res.status(400).json({ error: 'Keywords or categoryId parameter is required' });
    }
    if (!APP_KEY || !APP_SECRET || !ACCESS_TOKEN || !REFRESH_TOKEN || !TRACKING_ID) {
        return res.status(500).json({ error: 'Server is not configured correctly.' });
    }
    
    if (keywords) {
        keywords = translateHebrewToEnglish(keywords);
    }

    const performSearch = async () => {
        const API_BASE_URL = 'https://api-sg.aliexpress.com/sync';
        const METHOD_NAME = 'aliexpress.affiliate.product.query';
        const searchParams = {
            app_key: APP_KEY,
            access_token: ACCESS_TOKEN,
            method: METHOD_NAME,
            sign_method: 'sha256',
            timestamp: new Date().getTime(),
            keywords: keywords,
            tracking_id: TRACKING_ID,
            target_language: 'EN',
        };
        if (categoryId) {
            searchParams.category_id = categoryId;
        }
        const sign = generateSignature(searchParams, APP_SECRET);
        searchParams.sign = sign;
        const requestUrl = `${API_BASE_URL}?${new URLSearchParams(searchParams).toString()}`;
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

        console.log('--- FULL RESPONSE FROM ALIEXPRESS (SEARCH) ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('------------------------------------');

        res.json(data);

    } catch (error) {
        console.error('Error in /search endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch data from AliExpress API' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator
import requests
import os

app = Flask(__name__)

@app.route('/')
def home():
    return "AliExpress Search API is running."

@app.route('/translate')
def translate():
    q = request.args.get('q')
    if not q:
        return jsonify({"error": "Missing q parameter"})

    try:
        translated = GoogleTranslator(source='auto', target='en').translate(q)
        return jsonify({"original": q, "translated": translated})
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/search')
def search():
    q = request.args.get('q')
    if not q:
        return jsonify({"error": "Missing q parameter"})

    try:
        translated = GoogleTranslator(source='auto', target='en').translate(q)
        # נוסיף גרסאות שונות לשאילתה כדי לשפר דיוק
        keyword_variants = [
            translated,
            f"{translated} women",
            f"{translated} female",
            f"{translated} clothing",
            f"{translated} fashion"
        ]

        headers = {
            "Content-Type": "application/json"
        }

        results = []
        for keyword in keyword_variants:
            response = requests.get(
                "https://api-sg.aliexpress.com/sync",
                params={
                    "method": "aliexpress.affiliate.product.query",
                    "app_key": os.getenv("APP_KEY"),
                    "sign_method": "sha256",
                    "timestamp": str(int(requests.utils.datetime.datetime.utcnow().timestamp() * 1000)),
                    "keywords": keyword,
                    "tracking_id": os.getenv("TRACKING_ID"),
                    "target_language": "EN",
                    "access_token": os.getenv("ACCESS_TOKEN"),
                },
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "products" in data["result"]:
                    results.extend(data["result"]["products"])

        return jsonify({"search_for": translated, "results": results})

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=10000)

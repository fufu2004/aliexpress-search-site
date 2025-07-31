import os
import hashlib
import requests
from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

# קריאה מהסביבה
APP_KEY = os.environ.get("APP_KEY")
APP_SECRET = os.environ.get("APP_SECRET")
ACCESS_TOKEN = os.environ.get("ACCESS_TOKEN")
REFRESH_TOKEN = os.environ.get("REFRESH_TOKEN")
TRACKING_ID = os.environ.get("TRACKING_ID")

# הדפסה של משתנים חסרים
for var_name, value in {
    "APP_KEY": APP_KEY,
    "APP_SECRET": APP_SECRET,
    "ACCESS_TOKEN": ACCESS_TOKEN,
    "REFRESH_TOKEN": REFRESH_TOKEN,
    "TRACKING_ID": TRACKING_ID
}.items():
    if not value:
        print(f"⚠️ Environment variable '{var_name}' is MISSING!")

def generate_signature(params, secret):
    sorted_params = sorted(params.items())
    sign_str = ""
    for key, value in sorted_params:
        sign_str += key + str(value)
    return hashlib.sha256((sign_str + secret).encode()).hexdigest().upper()

def verify_token():
    url = "https://api-sg.aliexpress.com/sync"
    method = "aliexpress.affiliate.product.query"
    timestamp = int(requests.utils.datetime.datetime.now().timestamp() * 1000)

    params = {
        "app_key": APP_KEY,
        "method": method,
        "access_token": ACCESS_TOKEN,
        "sign_method": "sha256",
        "timestamp": timestamp,
        "tracking_id": TRACKING_ID,
        "keywords": "test",
    }

    params["sign"] = generate_signature(params, APP_SECRET)
    response = requests.post(url, params=params)
    return response.status_code == 200

@app.route("/")
def index():
    return "AliExpress Search API is running."

@app.route("/translate")
def translate():
    q = request.args.get("q")
    if not q:
        return jsonify({"error": "Missing q parameter"}), 400

    translated = GoogleTranslator(source='auto', target='en').translate(q)
    return jsonify({"original": q, "translated": translated})

@app.route("/search")
def search():
    q = request.args.get("q")
    if not q:
        return jsonify({"error": "Missing q parameter"}), 400

    translated = GoogleTranslator(source='auto', target='en').translate(q)
    if not verify_token():
        return jsonify({"error": "Token verification failed"}), 403

    url = "https://api-sg.aliexpress.com/sync"
    method = "aliexpress.affiliate.product.query"
    timestamp = int(requests.utils.datetime.datetime.now().timestamp() * 1000)

    params = {
        "app_key": APP_KEY,
        "method": method,
        "access_token": ACCESS_TOKEN,
        "sign_method": "sha256",
        "timestamp": timestamp,
        "tracking_id": TRACKING_ID,
        "keywords": translated,
    }

    params["sign"] = generate_signature(params, APP_SECRET)
    response = requests.post(url, params=params)

    if response.status_code != 200:
        return jsonify({"error": "API call failed", "status_code": response.status_code}), 500

    data = response.json()
    return jsonify({"results": data.get("result", {}).get("products", []), "search_for": translated})

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=10000)

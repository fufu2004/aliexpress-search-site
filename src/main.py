from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator
import os, time, hashlib, requests

app = Flask(__name__)

# ================= AliExpress API Config =================
APP_KEY = os.getenv("APP_KEY")
APP_SECRET = os.getenv("APP_SECRET")
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
REFRESH_TOKEN = os.getenv("REFRESH_TOKEN")
TRACKING_ID = os.getenv("TRACKING_ID")

# ================= Token Verification =================
def generate_signature(params: dict, secret: str) -> str:
    sign_str = ''.join([f"{k}{params[k]}" for k in sorted(params)])
    return hashlib.sha256((sign_str + secret).encode()).hexdigest().upper()

def verify_token():
    url = "https://api-sg.aliexpress.com/rest/auth/token/refresh"
    params = {
        "app_key": APP_KEY,
        "refresh_token": REFRESH_TOKEN,
        "sign_method": "sha256",
        "timestamp": int(time.time() * 1000)
    }
    params["sign"] = generate_signature(params, APP_SECRET)
    response = requests.post(url, params=params)
    data = response.json()
    return "access_token" in data or ("error_response" not in data)

# ================= Routes =================
@app.route("/")
def index():
    return "AliExpress Search API is running."

@app.route("/translate")
def translate():
    text = request.args.get("q")
    if not text:
        return jsonify({"error": "Missing q parameter"})
    translated = GoogleTranslator(source='auto', target='en').translate(text)
    return jsonify({"original": text, "translated": translated})

@app.route("/search")
def search():
    q = request.args.get("q")
    if not q:
        return jsonify({"error": "Missing q parameter"})

    translated_query = GoogleTranslator(source='auto', target='en').translate(q)

    if not verify_token():
        return jsonify({"error": "Invalid or expired access_token"})

    url = "https://api-sg.aliexpress.com/sync"
    method = "aliexpress.affiliate.product.query"

    params = {
        "app_key": APP_KEY,
        "access_token": ACCESS_TOKEN,
        "method": method,
        "sign_method": "sha256",
        "timestamp": int(time.time() * 1000),
        "keywords": translated_query,
        "tracking_id": TRACKING_ID,
        "target_language": "EN",
    }
    params["sign"] = generate_signature(params, APP_SECRET)

    response = requests.post(url, params=params)
    result = response.json()

    if "error_response" in result:
        return jsonify({"error": result["error_response"]})

    products = result.get("resp_result", {}).get("result", {}).get("products", [])
    return jsonify({"results": products, "search_for": translated_query})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=10000)

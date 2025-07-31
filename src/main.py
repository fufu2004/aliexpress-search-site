from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator
import requests
import hashlib
import os
from datetime import datetime

app = Flask(__name__)

# ENV variables
APP_KEY = os.getenv("APP_KEY")
APP_SECRET = os.getenv("APP_SECRET")
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
TRACKING_ID = os.getenv("TRACKING_ID")


def translate_text(text):
    try:
        translated = GoogleTranslator(source='auto', target='en').translate(text)
        return translated
    except Exception as e:
        print("Translation failed:", e)
        return text


def generate_signature(params, secret):
    sorted_params = sorted(params.items())
    sign_str = ""
    for k, v in sorted_params:
        sign_str += f"{k}{v}"
    return hashlib.sha256((sign_str + secret).encode()).hexdigest().upper()


def verify_token():
    global ACCESS_TOKEN
    if not ACCESS_TOKEN:
        return False

    test_url = "https://api-sg.aliexpress.com/sync"
    method = "aliexpress.affiliate.product.query"

    timestamp = int(datetime.now().timestamp() * 1000)

    params = {
        "method": method,
        "app_key": APP_KEY,
        "access_token": ACCESS_TOKEN,
        "sign_method": "sha256",
        "timestamp": timestamp,
        "keywords": "test",
        "tracking_id": TRACKING_ID
    }
    params["sign"] = generate_signature(params, APP_SECRET)

    try:
        response = requests.post(test_url, params=params)
        return response.status_code == 200
    except:
        return False


@app.route("/")
def home():
    return "AliExpress Search API is running."


@app.route("/translate")
def translate():
    text = request.args.get("q")
    if not text:
        return jsonify({"error": "Missing q parameter"}), 400

    translated = translate_text(text)
    return jsonify({"original": text, "translated": translated})


@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing q parameter"}), 400

    translated_query = translate_text(query)

    if not verify_token():
        return jsonify({"error": "Invalid or expired token"}), 401

    timestamp = int(datetime.now().timestamp() * 1000)

    params = {
        "method": "aliexpress.affiliate.product.query",
        "app_key": APP_KEY,
        "access_token": ACCESS_TOKEN,
        "sign_method": "sha256",
        "timestamp": timestamp,
        "keywords": translated_query,
        "tracking_id": TRACKING_ID,
        "target_language": "EN"
    }
    params["sign"] = generate_signature(params, APP_SECRET)

    try:
        response = requests.post("https://api-sg.aliexpress.com/sync", params=params)
        data = response.json()
        results = data.get("resp_result", {}).get("result", {}).get("products", [])
        return jsonify({"results": results, "search_for": translated_query})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)

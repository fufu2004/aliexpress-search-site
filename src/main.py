
from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

@app.route("/")
def index():
    return "AliExpress Translator API is running!"

@app.route("/translate")
def translate():
    text = request.args.get("text", "")
    translated = GoogleTranslator(source='auto', target='en').translate(text)
    return jsonify({"original": text, "translated": translated})

@app.route("/search")
def search():
    keywords = request.args.get("keywords", "")
    translated = GoogleTranslator(source='auto', target='en').translate(keywords)
    return jsonify({"original": keywords, "translated": translated})

from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

@app.route("/translate", methods=["POST"])
def translate():
    data = request.json
    text = data.get("text")
    target_lang = data.get("target_lang", "en")
    translated = GoogleTranslator(source='auto', target=target_lang).translate(text)
    return jsonify({"original": text, "translated": translated})

@app.route("/")
def home():
    return "Server is running!", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

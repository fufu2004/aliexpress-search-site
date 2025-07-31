from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

# מילון מותאם אישית
translation_map = {
    "חולצה אדומה": "red shirt",
    "שמלה שחורה": "black dress",
    "נעלי ספורט": "sport shoes",
    "טייץ נשים": "women leggings",
    "טייץ": "leggings",
    "חולצה": "shirt",
    "אדומה": "red",
    "שחורה": "black",
    "נשים": "women",
    "נעליים": "shoes",
    "ספורט": "sport",
    # ניתן להוסיף עוד לפי הצורך
}

def smart_translate(text):
    text = text.strip().lower()
    if text in translation_map:
        return {"original": text, "translated": translation_map[text]}

    # ננסה תרגום לפי מילים בודדות
    words = text.split()
    translated_words = []
    for word in words:
        if word in translation_map:
            translated_words.append(translation_map[word])
        else:
            try:
                translated = GoogleTranslator(source='auto', target='en').translate(word)
                translated_words.append(translated)
            except Exception:
                translated_words.append(word)

    return {
        "original": text,
        "translated": " ".join(translated_words)
    }

@app.route("/translate", methods=["GET"])
def translate():
    text = request.args.get("text")
    if not text:
        return jsonify({"error": "Missing 'text' parameter"}), 400

    result = smart_translate(text)
    return jsonify(result)

@app.route("/")
def home():
    return "Translation API is up. Use /translate?text=..."

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)

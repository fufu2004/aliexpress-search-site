from flask import Flask, jsonify, request
from deep_translator import GoogleTranslator

app = Flask(__name__)

# דף בית
@app.route("/")
def home():
    return "ברוך הבא ל־AliExpress Translator API 🎉"

# נקודת קצה לדוגמה לתרגום טקסט
@app.route("/translate", methods=["GET"])
def translate():
    text = request.args.get("text")
    target = request.args.get("to", "en")  # ברירת מחדל: אנגלית
    if not text:
        return jsonify({"error": "Missing 'text' parameter"}), 400

    try:
        translated = GoogleTranslator(source="auto", target=target).translate(text)
        return jsonify({"original": text, "translated": translated})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)


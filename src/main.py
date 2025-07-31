from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

# דוגמה פשוטה לבדיקה
@app.route('/')
def home():
    return 'API פעילה - נסה /translate או /search'

# נקודת תרגום בסיסית
@app.route('/translate')
def translate():
    original_text = request.args.get('text')
    if not original_text:
        return jsonify({'error': 'Missing "text" parameter'}), 400

    try:
        translated_text = GoogleTranslator(source='auto', target='en').translate(original_text)
        return jsonify({'original': original_text, 'translated': translated_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# נקודת חיפוש מדומה לשילוב עתידי
@app.route('/search')
def search():
    keywords = request.args.get('keywords')
    if not keywords:
        return jsonify({'error': 'Missing "keywords" parameter'}), 400

    try:
        translated_keywords = GoogleTranslator(source='auto', target='en').translate(keywords)
        # כאן תוכל לשלב את החיפוש מול אליאקספרס או כל API אחר
        return jsonify({'original': keywords, 'translated': translated_keywords})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)

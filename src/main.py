from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

@app.route('/translate', methods=['POST'])
def translate():
    data = request.get_json()
    text = data.get('text', '')
    target_lang = data.get('to', 'he')  # ברירת מחדל עברית
    translated = GoogleTranslator(source='auto', target=target_lang).translate(text)
    return jsonify({'translated': translated})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)

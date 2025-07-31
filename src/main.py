from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

@app.route('/')
def home():
    return 'AliExpress Translation API is running!'

@app.route('/translate', methods=['GET'])
def translate_text():
    text = request.args.get('text')
    if not text:
        return jsonify({'error': 'Missing text parameter'}), 400
    translated = GoogleTranslator(source='auto', target='en').translate(text)
    return jsonify({'original': text, 'translated': translated})

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Missing q parameter'}), 400
    translated_query = GoogleTranslator(source='auto', target='en').translate(query)
    # Dummy return for search query
    return jsonify({'search_for': translated_query, 'results': []})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
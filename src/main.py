
from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

@app.route('/')
def home():
    return 'AliExpress Search API is running.'

@app.route('/translate', methods=['GET'])
def translate():
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Missing q parameter'}), 400

    try:
        translated = GoogleTranslator(source='auto', target='en').translate(query)
        return jsonify({'original': query, 'translated': translated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('q') or request.args.get('keywords')
    if not query:
        return jsonify({'error': 'Missing search parameter'}), 400

    try:
        translated = GoogleTranslator(source='auto', target='en').translate(query)
        return jsonify({'search_for': translated, 'results': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)

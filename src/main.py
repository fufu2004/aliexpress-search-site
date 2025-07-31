from flask import Flask, request, jsonify
from deep_translator import GoogleTranslator

app = Flask(__name__)

@app.route('/')
def home():
    return "🔍 AliExpress Translator API is running!"

@app.route('/translate', methods=['GET'])
def translate_text():
    original_text = request.args.get('text', '')
    if not original_text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        translated = GoogleTranslator(source='auto', target='en').translate(original_text)
        return jsonify({'original': original_text, 'translated': translated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)


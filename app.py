import os
import json
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static')
SCORE_FILE = 'highscore.json'

def load_high_score():
    if os.path.exists(SCORE_FILE):
        try:
            with open(SCORE_FILE, 'r') as f:
                data = json.load(f)
                return data.get('high_score', 0)
        except Exception:
            return 0
    return 0

def save_high_score(score):
    try:
        with open(SCORE_FILE, 'w') as f:
            json.dump({'high_score': score}, f)
    except Exception as e:
        print(r"Error saving high score: {e}")

# Serve the frontend
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Static files route fallbacks
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# API Endpoints
@app.route('/api/highscore', methods=['GET'])
def get_highscore():
    return jsonify({'high_score': load_high_score()})

@app.route('/api/highscore', methods=['POST'])
def update_highscore():
    data = request.get_json() or {}
    new_score = data.get('score', 0)
    current_high = load_high_score()
    
    if new_score > current_high:
        save_high_score(new_score)
        return jsonify({'high_score': new_score, 'updated': True})
    
    return jsonify({'high_score': current_high, 'updated': False})

if __name__ == '__main__':
    # Runs locally on http://127.0.0.1:5000
    app.run(debug=True, port=5000)
"""
Ultra-Fast AI Tutor Service using Groq API
Groq provides 10x faster inference than other providers
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Groq API configuration - FASTEST available
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Store active tutor sessions
tutor_sessions = {}

def call_groq(messages, max_tokens=600):
    """Ultra-fast Groq API call"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",  # Fastest Groq model
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": max_tokens
    }
    response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "status": "online",
        "service": "NeuroLearn AI Tutor",
        "endpoints": ["/health", "/chat", "/generate-syllabus"]
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "tutor_service", "engine": "groq"})

@app.route('/generate-syllabus', methods=['POST'])
def generate_syllabus_endpoint():
    """Generate syllabus using ultra-fast Groq"""
    try:
        data = request.json
        topic = data.get('topic')
        
        if not topic:
            return jsonify({"success": False, "error": "Topic is required"}), 400
        
        messages = [{
            "role": "user",
            "content": f"Create a concise 4-week learning syllabus for: {topic}\n\nFormat:\n1. Overview\n2. Week-by-week topics\n3. Key skills"
        }]
        
        syllabus = call_groq(messages, max_tokens=800)
        
        return jsonify({
            "success": True,
            "topic": topic,
            "syllabus": syllabus
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/init-tutor', methods=['POST'])
def init_tutor():
    """Initialize tutor session"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        syllabus = data.get('syllabus')
        topic = data.get('topic')
        
        if not session_id or not syllabus or not topic:
            return jsonify({"success": False, "error": "sessionId, syllabus, and topic are required"}), 400
        
        tutor_sessions[session_id] = {
            "syllabus": syllabus[:400],  # Truncate for speed
            "topic": topic,
            "chat_history": []
        }
        
        return jsonify({
            "success": True,
            "sessionId": session_id,
            "message": "Tutor ready"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Ultra-fast chat with Groq"""
    try:
        data = request.json
        session_id = data.get('sessionId')
        message = data.get('message')
        
        if not session_id or not message:
            return jsonify({"success": False, "error": "sessionId and message are required"}), 400
        
        if session_id not in tutor_sessions:
            return jsonify({"success": False, "error": "Session not found"}), 404
        
        session = tutor_sessions[session_id]
        
        # Enhanced system prompt for better tutoring
        messages = [{
            "role": "system",
            "content": f"You are an expert tutor teaching {session['topic']}. Be concise, encouraging, and use examples. Break complex topics into simple steps. If the student seems confused, offer clarification. Use code blocks for programming examples."
        }]
        
        # Keep last 8 messages for better context
        for msg in session['chat_history'][-8:]:
            messages.append(msg)
        
        messages.append({"role": "user", "content": message})
        
        ai_response = call_groq(messages, max_tokens=500)
        
        # Update history
        session['chat_history'].append({"role": "user", "content": message})
        session['chat_history'].append({"role": "assistant", "content": ai_response})
        
        return jsonify({
            "success": True,
            "response": ai_response,
            "sessionId": session_id
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/get-history', methods=['GET'])
def get_history():
    session_id = request.args.get('sessionId')
    if not session_id or session_id not in tutor_sessions:
        return jsonify({"success": False, "error": "Session not found"}), 404
    session = tutor_sessions[session_id]
    return jsonify({"success": True, "history": session['chat_history'], "topic": session['topic']})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print("⚡ GROQ-Powered AI Tutor - Ultra Fast Mode")
    print(f"🔑 API Key: {'✅ Loaded' if GROQ_API_KEY else '❌ Missing'}")
    print(f"🎓 Starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)

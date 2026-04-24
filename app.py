from dotenv import load_dotenv
import os

load_dotenv()

from flask import Flask, request, jsonify, render_template
from analyzer import analyze_code
from groq import Groq

app = Flask(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith(".py"):
        return jsonify({"error": "Please upload a Python file only"}), 400
    
    source_code = file.read().decode("utf-8")
    
    results = analyze_code(source_code)
    
    return jsonify({"results": results})

@app.route("/explain", methods=["POST"])
def explain():
    data = request.get_json()
    item_type = data.get("type")
    item_name = data.get("name")
    item_message = data.get("message")

    prompt = f"""
    A Python code analysis tool found this dead code issue:
    Type: {item_type}
    Name: {item_name}
    Message: {item_message}

    Please explain:
    1. Why this is a problem
    2. How to fix it
    3. Best practice to avoid this in future

    Keep it simple and clear.
    """

    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama3-8b-8192",
    )

    explanation = chat_completion.choices[0].message.content

    return jsonify({"explanation": explanation})

if __name__ == "__main__":
    app.run(debug=True)
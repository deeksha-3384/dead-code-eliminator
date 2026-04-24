from dotenv import load_dotenv
import os, sqlite3, json
from datetime import datetime
load_dotenv()

from flask import Flask, request, jsonify, render_template, g
from analyzer import analyze_code
from groq import Groq

app = Flask(__name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
DB_PATH = 'history.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_db(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            language TEXT,
            score INTEGER,
            total_issues INTEGER,
            dead_functions INTEGER,
            dead_variables INTEGER,
            dead_imports INTEGER,
            results TEXT,
            cleaned_code TEXT,
            original_code TEXT,
            created_at TEXT
        )''')
        conn.commit()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    source_code = None
    filename = "pasted_code.py"
    language = "python"

    if request.is_json:
        data = request.get_json() or {}
        source_code = data.get("code", "")
        language = data.get("language", "python")
        if not source_code:
            return jsonify({"error": "No code provided"}), 400
    else:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        filename = file.filename
        source_code = file.read().decode("utf-8")

    try:
        results, score, cleaned_code = analyze_code(source_code)
    except Exception as exc:
        return jsonify({"error": "Analysis failed", "details": str(exc)}), 500

    dead_func = sum(1 for r in results if r['type'] == 'Unused Function')
    dead_var  = sum(1 for r in results if r['type'] == 'Unused Variable')
    dead_imp  = sum(1 for r in results if r['type'] == 'Unused Import')

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''INSERT INTO history
            (filename, language, score, total_issues, dead_functions,
             dead_variables, dead_imports, results, cleaned_code, original_code, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            (filename, language, score, len(results),
             dead_func, dead_var, dead_imp,
             json.dumps(results), cleaned_code, source_code,
             datetime.now().strftime("%Y-%m-%d %H:%M")))
        conn.commit()

    return jsonify({
        "results": results,
        "score": score,
        "cleaned_code": cleaned_code,
        "original_code": source_code
    })

@app.route("/history", methods=["GET"])
def get_history():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            'SELECT * FROM history ORDER BY id DESC LIMIT 20').fetchall()
    return jsonify({"history": [dict(r) for r in rows]})

@app.route("/history/delete", methods=["POST"])
def delete_history():
    data = request.get_json() or {}
    ids = data.get("ids", [])
    if not isinstance(ids, list) or not ids:
        return jsonify({"error": "No history IDs provided"}), 400

    cleaned_ids = []
    for value in ids:
        try:
            cleaned_ids.append(int(value))
        except (TypeError, ValueError):
            continue
    cleaned_ids = list(set(cleaned_ids))
    if not cleaned_ids:
        return jsonify({"error": "Invalid history IDs"}), 400

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            f"DELETE FROM history WHERE id IN ({','.join('?' for _ in cleaned_ids)})",
            cleaned_ids
        )
        conn.commit()

    return jsonify({"deleted": len(cleaned_ids)})

@app.route("/explain", methods=["POST"])
def explain():
    data = request.get_json()
    prompt = f"""A Python code analysis tool found this dead code issue:
Type: {data.get('type')}
Name: {data.get('name')}
Message: {data.get('message')}
Please explain: 1. Why this is a problem 2. How to fix it 3. Best practice to avoid this in future. Keep it simple and clear."""

    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama3-8b-8192",
    )
    return jsonify({"explanation": chat_completion.choices[0].message.content})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
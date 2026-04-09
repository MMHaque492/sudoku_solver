# app.py
import os
import subprocess
from flask import Flask, render_template, request, jsonify

app = Flask(__name__, static_url_path='', static_folder='.')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    try:
        data = request.get_json()
        if not data or 'board' not in data:
            return jsonify({"error": "Missing board data"}), 400

        board = data['board']
        input_data = "\n".join([" ".join(map(str, row)) for row in board])
        
        executable = "solver_exe.exe" if os.name == 'nt' else "./solver_exe"
        exe_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), executable)

        if not os.path.exists(exe_path):
             return jsonify({"error": f"Executable not found. Please compile solver.cpp."}), 500

        process = subprocess.Popen(
            [exe_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=input_data, timeout=5)

        if "NOSOLUTION" in stdout:
            return jsonify({"error": "No valid solution exists."}), 400

        output_lines = stdout.strip().split('\n')
        time_ms = output_lines[-1]
        solution = [list(map(int, line.split())) for line in output_lines[:-1]]

        return jsonify({"solution": solution, "time": time_ms})

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Engine computation timeout"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
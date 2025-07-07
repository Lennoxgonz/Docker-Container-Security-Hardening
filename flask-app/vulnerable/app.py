import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return "This is a vulnerable app"


@app.route("/api/lookup")
def lookup():
    host = request.args.get("host", "")

    cmd = f"ping -c 1 {host}"

    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=5
        )

        output = result.stdout
        error = result.stderr

    except subprocess.TimeoutExpired:
        output = ""
        error = "Command timed out after 5 seconds."

    return jsonify(command=cmd, output=output, error=error)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

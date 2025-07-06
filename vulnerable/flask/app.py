import os
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return "This is a vulnerable app"


@app.route("/api/lookup")
def lookup():
    host = request.args.get("host", "")

    # Vulnerability #1 - Directly using user input in a shell command
    # This leaves the endpoint vulnerable to command injection
    cmd = f"ping -c 1 {host}"

    # Normally this would return the output off
    # This just confirms the command that would have run
    os.system(cmd)

    return jsonify(message="Lookup command executed.", command=cmd)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

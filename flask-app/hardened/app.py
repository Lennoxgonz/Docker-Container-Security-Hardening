import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return "This is a hardened app"


@app.route("/api/ping")
def lookup():
    host = request.args.get("host", "")

    # Vulnerability #1 - Command Injection 
    # The original vulnerable code was:
    '''
    cmd = f"ping -c 1 {host}"

    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=5
        )
    '''
    
    # The command is now a fixed argv list and is not run in a shell
    command_list = ['ping', '-c', '1', host]

    try:
        # The command list is passed in, and 'shell=True' is removed
        result = subprocess.run(
            command_list, capture_output=True, text=True, timeout=10
        )

        output = result.stdout
        error = result.stderr


    except subprocess.TimeoutExpired:
        output = ""
        error = "Command timed out after 10 seconds."

    return jsonify(command=command_list, output=output, error=error)


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0")

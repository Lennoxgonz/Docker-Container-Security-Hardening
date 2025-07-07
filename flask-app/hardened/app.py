import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return "This is a vulnerable app"


@app.route("/api/lookup")
def lookup():
    host = request.args.get("host", "")

    '''
    # Vulnerability #1 - directly using user input in a shell command this allows for 
    # attackers to string together commands using character like ||, &&, ;, and more
    # Ex: "ping -c 1 localhost; ls"

    cmd = f"ping -c 1 {host}"

    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=5
        )
    '''

    # The command is now a list of arguments since it will not be run in shell
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

    return jsonify(command=cmd, output=output, error=error)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

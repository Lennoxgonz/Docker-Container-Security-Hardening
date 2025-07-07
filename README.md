# Docker Container Security Hardening

## Setup

### Requirements

* [Docker](https://www.docker.com/) 

### Quick Start

* Building and running vulnerable version

`cd ./app-you-want-to-build/vulnerable`
`docker build -t vulnerable-app .`   
`docker run -d -p 5000:5000 --name vulnerable-conainer vulnerable-app`

To execute exploits, read explanations of why they are dangerous, and see their solutions, check the section of the specific app which you have built and ran

* Building and running hardened version with vulnerability fixes 

`cd ./app-you-want-to-build/hardened`
`docker build -t hardened-app .`   
`docker run -d -p 5000:5000 --name hardened-container hardened-app`

## Vulnerabilities per app

### Flask app

1. Command Injection Exploit

**Vulnerable code**

```
cmd = f"ping -c 1 {host}"

try:
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=5
    )
```

This code is directly using user input in a shell command, this leaves the endpoint vulnerable to command injection by stringing together commands with special characters such as `ping -c 1 localhost; ls`

**Hardened code**

```
command_list = ['ping', '-c', '1', host]

    try:
        # The command is passed as a list, and 'shell=True' is REMOVE

        result = subprocess.run(
            command_list, capture_output=True, text=True, timeout=10
        )
```

This code is hardened by the removal of the shell=True parameter. This makes it so characters like ; are not interperted, which removes the ability of attackers to inject commands. Since the shell is not being used the command must be split up into a list

**Excecuting exploit**

Attackers can pass in a parameter which will succesfully run then ping command. Then add a special character like ;(encoded as %3B) followed by a malicious command, this will allow attackers to run commands directly on the containers shell

* This command will return the source code of the application
`http://localhost:5000/api/lookup?host=localhost%3Bcat%20app.py`

* This command will return the username that the web server process is using inside the container, this reveals vulnerability #3
`http://localhost:5000/api/lookup?host=localhost%3B%20whoami`

* This command will return all ENV variables
`http://localhost:5000/api/lookup?host=localhost%3Benv`

2. Vulnerable Python Image

**Vulnerable code**

`FROM python:3.7-slim`

This Python image has known vulnerabilities

**Hardened code**
**Excecuting exploit**











2. Vulnerable Python Image

**Vulnerable code**
**Hardened code**
**Excecuting exploit**

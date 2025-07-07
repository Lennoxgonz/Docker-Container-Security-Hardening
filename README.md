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

#### Vulnerability #1 - Command Injection Exploit ####

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

* This command will return the username that the web server process is using inside the container, this reveals vulnerability #4
`http://localhost:5000/api/lookup?host=localhost%3B%20whoami`

* This command will return all ENV variables
`http://localhost:5000/api/lookup?host=localhost%3Benv`

#### Vulnerability #2 - Vulnerable and Floating Python Image ####

**Vulnerable code**

`FROM python:3.7`

This Python image is based on a version of Python that has reached end of life and has known vulnerabilities. These vulnerabilities can be found with a tool like Trivy or directly on the Docker Hub website.

In addition it is a floating tag, this means it is not pinned to one specific image of Python. Instead it points to the latest version published by the image maintainer. This is problematic as introduces unpredictable bugs, changes, and security vulnerabilities as the image may change with subsequent rebuilds.

**Hardened code**

`FROM python:3.13.5-slim-bookworm`

This Python image is up to date and has no know vulnerabilties. It is also very specific, or pinned, this ensures that the image stays exactly the same on subsequent rebuild to ensure no unexpected issues are introduced by using a slightly different imager version.

**Excecuting exploit**











2. Vulnerable Python Image

**Vulnerable code**
**Hardened code**
**Excecuting exploit**

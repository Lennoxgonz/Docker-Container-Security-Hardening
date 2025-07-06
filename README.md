# Docker Container Security Hardening

## Setup

### Requirements

* [Docker](https://www.docker.com/) 

### Quick Start

`git clone`
`cd ./vulnerable/app-you-want-to-build`
`docker build -t vulnerable-app .`   
`docker run -d -p 5000:5000 --name vulnerable-container vulnerable-app`

To execute exploits, read explanations of why they are dangerous, and see their solutions, check the section of the projecet which you have built and ran

## Vulnerabilities

### Flask

#### Command injection exploit ####

```
# Vulnerability - Directly using user input in a shell command
# This leaves the endpoint vulnerable to command injection

cmd = f"ping -c 1 {host}"
```

#### Excecuting exploit ####

Enter this link into your browser, you will receive a response like this

```
command	"ping -c 1 8.8.8.8;ls"
message	"Lookup command executed."
```

This shows the command sent in the link and confirmation it was excecuted
`http://localhost:5000/api/lookup?host=8.8.8.8;ls`



# Docker Container Security Hardening

This repository will be a hands-on guide on how to identify and mitigate common application security flaws. It will contain a number of sample applications, each application will contain a vulnerable and hardened version.

For each sample application this README will provide a detailed outline of each security vulnerability, a clear explanation of the solution implemented in the hardened version, and an explanation as to how the vulnerability could be exploited.

## Quick Start

### PERN App (Docker Compose)

* Building and running vulnerable version.

`cd ./PERN-app/vulnerable`

`docker compose up`

* Building and running hardened version with vulnerability fixes.

`cd ./PERN-app/hardened`

`docker compose up`

### Flask App (Single Docker File)

* Building and running vulnerable version.

`cd ./flask-app/vulnerable`

`docker build -t vulnerable-app .`

`docker run -d -p 5000:5000 --name vulnerable-container vulnerable-app`

* Building and running hardened version with vulnerability fixes.

`cd ./flask-app/hardened`

`docker build -t hardened-app .`

`docker run -d -p 5000:5000 --name hardened-container hardened-app`

To execute exploits, read explanations of why they are dangerous, and see their solutions, check the section for the specific app which you have built and run.

<br>
<br>

## Vulnerabilities Per App

### Flask App

This will be a sample web application built in Python with the Flask framework.

#### Vulnerability #1 - Command Injection 

---

**Vulnerable code**

```
cmd = f"ping -c 1 {host}"

try:
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=5
    )
```

The ping function is commonly used in code to check if a server or device on a network is reachable and responsive. The vulnerability comes from the fact that this code is directly using user input in a shell command. This leaves the endpoint vulnerable to command injection by stringing together commands with special characters such as ||, &&, ;, and more. 

Ex: `ping -c 1 localhost; ls`


**Hardened code**

```
safe_host = shlex.quote(host)
command_list = ['ping', '-c', '1', safe_host]

    try:
        # The command is passed as a list, and 'shell=True' is removed

        result = subprocess.run(
            command_list, capture_output=True, text=True, timeout=10
        )
```

This code is hardened by the removal of the shell=True parameter. This makes it so characters like ; are not interpreted, which removes the ability of attackers to inject commands. Since the shell is not being used the command must be split up into a list.

In addition, the user input is passed into shlex.quote() which will escape special characters/instructions like -f by wrapping the input in quotes. This is done as a best practice.

In a production level app where many commands may have to be run, a command whitelist may also be used. 
```
if command_to_run not in ALLOWED_COMMANDS:
        return jsonify(error="Command not permitted"), 403
```

**Exploiting Vulnerability**

Attackers can pass in a parameter which will run the ping command. Then add a special character like ;(encoded as %3B) followed by a malicious command. This allows attackers to run commands directly on the container's shell.

* This will return the source code of the application.

`curl http://localhost:5000/api/ping?host=localhost%3Bcat%20app.py`

* This will return the username that the web server process is using inside the container, this reveals the container is running as root, which is vulnerability #4.

`curl http://localhost:5000/api/ping?host=localhost%3B%20whoami`

* This will return all ENV variables.

`curl http://localhost:5000/api/ping?host=localhost%3Benv`

<br>

#### Vulnerability #2 - Out of Date and Floating Python Image

---

**Vulnerable Code**

`FROM python:3.7-slim`

This Python image is based on a version of Python that has reached end of life and has many known vulnerabilities/critical CVEs at the time of writing. These can be found with a tool like Trivy or directly on the [Docker Hub](https://hub.docker.com/layers/library/python/3.7-slim/images/sha256-071f13f6042c9163a1a16339d9306278568b72427aced66370a638a10309fab6) website.

In addition, it is a floating tag. This means it is not pinned to one specific image of Python. Instead it points to the latest version published by the image maintainer. This is problematic as it introduces unpredictable bugs, changes, and security vulnerabilities as the image may not be exactly the same with subsequent rebuilds.

**Hardened Code**

`FROM python:3.13.5-slim-bookworm`

This Python image is up to date and has no known vulnerabilities. It is also very specific, or pinned. This ensures that the image stays exactly the same on subsequent rebuilds to ensure no unexpected issues are introduced by using a slightly different image version.

**Exploiting Vulnerability**

The Python image used in the vulnerable app has many vulnerabilities/CVEs, which can be found on [Docker Hub](https://hub.docker.com/layers/library/python/3.7-slim/images/sha256-071f13f6042c9163a1a16339d9306278568b72427aced66370a638a10309fab6) and other websites or using tools like Trivy.

A few of the most severe CVEs include:

[CVE-2024-45491](https://scout.docker.com/vulnerabilities/id/CVE-2024-45491?s=debian&n=expat&ns=debian&t=deb&osn=debian&osv=12&vr=%3C2.5.0-1%2Bdeb12u1&utm_source=hub&utm_medium=ExternalLink&_gl=1*12l1hnd*_ga*NTk0NzY2OTM3LjE3NTE5ODg0NjM.*_ga_XJWPQMJYHQ*czE3NTE5ODg0NjMkbzEkZzEkdDE3NTE5OTI3NDckajIzJGwwJGgw)
"An issue was discovered in libexpat before 2.6.3. dtdCopy in xmlparse.c can have an integer overflow for nDefaultAtts on 32-bit platforms (where UINT_MAX equals SIZE_MAX)."

[CVE-2022-40897](https://scout.docker.com/vulnerabilities/id/CVE-2022-40897?s=github&n=setuptools&t=pypi&vr=%3C65.5.1&utm_source=hub&utm_medium=ExternalLink&_gl=1*11u21ic*_ga*NTk0NzY2OTM3LjE3NTE5ODg0NjM.*_ga_XJWPQMJYHQ*czE3NTE5ODg0NjMkbzEkZzEkdDE3NTE5OTI3ODMkajYwJGwwJGgw)
"Python Packaging Authority (PyPA)'s setuptools is a library designed to facilitate packaging Python projects. Setuptools version 65.5.0 and earlier could allow remote attackers to cause a denial of service by fetching malicious HTML from a PyPI package or custom PackageIndex page due to a vulnerable Regular Expression in package_index. This has been patched in version 65.5.1."

[CVE-2023-4911](https://scout.docker.com/vulnerabilities/id/CVE-2023-4911?s=debian&n=glibc&ns=debian&t=deb&osn=debian&osv=12&vr=%3C2.36-9%2Bdeb12u3&utm_source=hub&utm_medium=ExternalLink&_gl=1*tipgt7*_ga*NTk0NzY2OTM3LjE3NTE5ODg0NjM.*_ga_XJWPQMJYHQ*czE3NTE5ODg0NjMkbzEkZzEkdDE3NTE5OTI4NjgkajU0JGwwJGgw)
"A buffer overflow was discovered in the GNU C Library's dynamic loader ld.so while processing the GLIBC_TUNABLES environment variable. This issue could allow a local attacker to use maliciously crafted GLIBC_TUNABLES environment variables when launching binaries with SUID permission to execute code with elevated privileges."

<br>

#### Vulnerability #3 - Secret Stored Directly in Dockerfile

---

**Vulnerable code**

`ENV API_KEY="secretkey"`

Storing secrets/sensitive information such as API keys directly as an environment variable in a Dockerfile or any project file is a major security risk. Doing so leaks the key into the project's version control, allowing anyone with access to the repository to access the secret. Furthermore, commands like `docker history` and `docker inspect` can be used on the image to access the secret. Lastly, storing secrets like this makes changing them in the future less efficient since you would need to completely rebuild and redeploy the container.

**Hardened code**

This vulnerability can be remedied in a variety of ways. The simplest is to pass in the secret as an environment variable at runtime. This makes it so that the secret only exists for the life of the container and is not stored in the image.

`docker run -d -p 5000:5000 -e API_KEY='secretkey' --name hardened-container hardened-app`

Another option is to use a local .env file to hold secrets. As long as .env is included in your .gitignore it will never be pushed to the repository. This option works for local development but is limited when working in a shared environment or pushing to production.

`docker run -d -p 5000:5000 --env-file ./.env --name hardened-container hardened-app`

A more robust and secure option is to use a dedicated secret manager from a cloud provider like AWS, Azure, or Google Cloud. The secret is stored in the secret manager, then encrypted and never again seen as plain text. You can then use an SDK from the secret manager provider to access the secret through an API call and use it in the application.

```
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
name = "projects/hardened-app/secrets/API-key/versions/latest"
response = client.access_secret_version(name=name)
my_secret = response.payload.data.decode("UTF-8")
```

**Exploiting Vulnerability**

If a secret is stored directly in a project file, anyone with access to that file or the repository where it is stored can access that secret. In addition the commands `docker history` and `docker inspect` can be used to access a secret that has been stored in an insecure manner. If an attacker gains shell access to a container they can use the `env` or `printenv` command to access all environment variables.

<br>

#### Vulnerability #4 - Running Container as Root User

---

**Vulnerable code**

```
FROM python:3.7-slim
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && \
    apt-get install -y iputils-ping && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /var/lib/apt/lists/*
COPY . .

ENV API_KEY="secretkey"

EXPOSE 5000

CMD ["python", "app.py"]
```

By default, Docker containers run as the root user. This is a significant security risk as if an attacker compromises a process inside the container, they would gain superuser privileges over that container. For this reason a new less privileged user should always be created and used.

**Hardened code**

```
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser
```

This code adds a new user and gives it ownership over the /app so it can be used instead of the root user.

**Exploiting Vulnerability**

For an attacker to take advantage of this vulnerability they would first have to find an entry point through another vulnerability in the application. This could be anything that allows for remote code execution. Something like vulnerability #1 would be an easy entry point for an attacker to start running commands on the container's shell. As a superuser they would have much more freedom as to how they could go about their attacks.

Once attackers have access to the container's shell as root user they can run commands like apt-get. This can be used to download network scanners like nmap, password crackers like hashcat, packet sniffers like tcpdump, or any other tools attackers may find useful in their attack. 

Attackers would also gain full access to read and overwrite application source code. This would allow attackers to add more vulnerabilities or backdoors into the application.

As root user the attacker would also be well positioned to try to take advantage of a kernel level exploit or another misconfiguration in the Docker container to attempt a container escape. If successful, the attacker would have access to the host machine and all containers running on that machine.

<br>

### PERN App

Change url in frontend api.ts and remove gitpod from allows host in vite config and backend

This will be a sample web application using Express.js with a PostgeSQL database for the backend and React for the frontend.

#### Vulnerability #1 - Insecure Password Hashing

---

**Vulnerable code**

./backend/src/user-service.ts
```
export const createUser = async (newUser: User) => {
  const { username, password } = newUser;
  const md5Hash = crypto.createHash("md5").update(password).digest("hex");
  const sql = "INSERT INTO users (username, password) VALUES ($1, $2)";
  return query(sql, [username, md5Hash]);
};

export const findUser = async (credentials: User) => {
  const { username, password } = credentials;
  const md5Hash = crypto.createHash("md5").update(password).digest("hex");
  const sql = "SELECT * FROM users WHERE username = $1 AND password = $2";
  const result = await query(sql, [username, md5Hash]);
  return result.rows[0];
};
```

<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>

#### Vulnerability #2 - SQL Injection 

---

**Vulnerable code**



<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>

#### Vulnerability #3 - Insecure Direct Object Reference

---

**Vulnerable code**



<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>

#### Vulnerability #4 - Exposed Docker Socket

---

**Vulnerable code**



<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>

#### Vulnerability #5 - Exposed Docker Socket

---

**Vulnerable code**



<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>

#### Vulnerability #6 - Exposed Database Port

---

**Vulnerable code**



<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>


### App

#### Vulnerability #1 - 

---

**Vulnerable code**



<br>

**Hardened code**



<br>

**Exploiting Vulnerability**



<br>
# Docker Container Security Hardening

This repository is a hands-on guide to identifying and mitigating common application security flaws. It contains multiple sample applications, and each application includes a vulnerable and hardened version.

For each sample application, this README provides a detailed outline of each security vulnerability, a clear explanation of the solution implemented in the hardened version, and an explanation of how the vulnerability could be exploited.

For every app in this repository, `vulnerable` is the baseline and `hardened` is a direct refactor of the same app.

## Quick Start

### PERN App (Docker Compose)

* Building and running vulnerable version.

`cd PERN-app/vulnerable`

`docker compose up`

* Building and running hardened version with vulnerability fixes.

`cd PERN-app/hardened`

`docker compose up`

### Flask App (Single Docker File)

* Building and running vulnerable version.

`cd flask-app/vulnerable`

`docker build -t vulnerable-app .`

`docker run -d -p 5000:5000 --name vulnerable-container vulnerable-app`

* Building and running hardened version with vulnerability fixes.

`cd flask-app/hardened`

`docker build -t hardened-app .`

`docker run -d -p 5000:5000 --name hardened-container hardened-app`

To execute exploits, review why they are dangerous, and see the corresponding solutions, check the section for the specific app you built and ran.

<br>
<br>

## Vulnerabilities Per App

### Flask App

This is a sample web application built in Python with the Flask framework.
Paths for this section: `flask-app/vulnerable` and `flask-app/hardened`.

#### Vulnerability #1 - Command Injection 

---

**Vulnerable Code**

`flask-app/vulnerable/app.py`

```
cmd = f"ping -c 1 {host}"

try:
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=5
    )
```

The ping function is commonly used in code to check if a server or device on a network is reachable and responsive. The vulnerability comes from the fact that this code is directly using user input in a shell command. This leaves the endpoint vulnerable to command injection by stringing together commands with special characters such as ||, &&, ;, and more. 

Ex: `ping -c 1 localhost; ls`


**Hardened Code**

`flask-app/hardened/app.py`

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

In a production-level app where many commands may need to run, a command whitelist may also be used.
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

`flask-app/vulnerable/Dockerfile`

`FROM python:3.7-slim`

This Python image is based on a version of Python that has reached end of life and has many known vulnerabilities/critical CVEs at the time of writing. These can be found with a tool like Trivy or directly on the [Docker Hub](https://hub.docker.com/layers/library/python/3.7-slim/images/sha256-071f13f6042c9163a1a16339d9306278568b72427aced66370a638a10309fab6) website.

In addition, it is a floating tag. This means it is not pinned to one specific image of Python. Instead it points to the latest version published by the image maintainer. This is problematic as it introduces unpredictable bugs, changes, and security vulnerabilities as the image may not be exactly the same with subsequent rebuilds.

**Hardened Code**

`flask-app/hardened/Dockerfile`

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

**Vulnerable Code**

`flask-app/vulnerable/Dockerfile`

`ENV API_KEY="secretkey"`

Storing secrets/sensitive information such as API keys directly as an environment variable in a Dockerfile or any project file is a major security risk. Doing so leaks the key into the project's version control, allowing anyone with access to the repository to access the secret. Furthermore, commands like `docker history` and `docker inspect` can be used on the image to access the secret. Lastly, storing secrets like this makes changing them in the future less efficient since you would need to completely rebuild and redeploy the container.

**Hardened Code**

`flask-app/hardened/Dockerfile` (no hardcoded secret; runtime/env-based secret injection)

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

**Vulnerable Code**

`flask-app/vulnerable/Dockerfile`

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

**Hardened Code**

`flask-app/hardened/Dockerfile`

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

As the root user, the attacker would also be well positioned to exploit a kernel-level vulnerability or another Docker misconfiguration to attempt a container escape. If successful, the attacker would gain access to the host machine and all containers running on that machine.

<br>

### PERN App

This is a sample web application using Express.js with a PostgreSQL database for the backend and React for the frontend.

#### Vulnerability #1 - Insecure Password Hashing

---

**Vulnerable Code**

- Part 1/3 and Part 2/3: `PERN-app/vulnerable/backend/src/user-service.ts` (`createUser` and `findUser`)
- Part 3/3: `PERN-app/vulnerable/backend/src/index.ts` (seed user hashing in `startServer`)

<br>

`PERN-app/vulnerable/backend/src/user-service.ts`
```ts
export const createUser = async (newUser: AuthCredentialsDto) => {
  const { username, password } = newUser;
  const md5Hash = crypto.createHash("md5").update(password).digest("hex");
  const sql = "INSERT INTO users (username, password) VALUES ($1, $2)";
  return query(sql, [username, md5Hash]);
};

export const findUser = async (credentials: AuthCredentialsDto) => {
  const { username, password } = credentials;
  const md5Hash = crypto.createHash("md5").update(password).digest("hex");
  const sql = "SELECT * FROM users WHERE username = $1 AND password = $2";
  const result = await query(sql, [username, md5Hash]);
  return result.rows[0];
};
```

`PERN-app/vulnerable/backend/src/index.ts`
```ts
for (const user of usersToSeed) {
  const md5Hash = crypto
    .createHash("md5")
    .update(user.password)
    .digest("hex");
  const seedQuery = {
    text: `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
    values: [user.username, md5Hash],
  };
  await query(seedQuery.text, seedQuery.values);
}
```
<br>

**Hardened Code**

`PERN-app/hardened/backend/src/user-service.ts`  
```ts
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const createUser = async (newUser: AuthCredentialsDto) => {
  const { username, password } = newUser;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return query("INSERT INTO users (username, password) VALUES ($1, $2)", [
    username,
    hashedPassword,
  ]);
};

export const findUser = async (credentials: AuthCredentialsDto) => {
  const { username, password } = credentials;
  const result = await query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  const user = result.rows[0];
  return user && (await bcrypt.compare(password, user.password)) ? user : null;
};
```
`PERN-app/hardened/backend/src/index.ts`
```ts
const seedUserPassword = process.env.SEED_USER_PASSWORD;
if (!seedUserPassword) {
  throw new Error("SEED_USER_PASSWORD is required for local seed data");
}

for (const user of usersToSeed) {
  const hashedPassword = await bcrypt.hash(seedUserPassword, SALT_ROUNDS);
  const seedQuery = {
    text: `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
    values: [user.username, hashedPassword],
  };
  await query(seedQuery.text, seedQuery.values);
}
```

<br>

**Exploiting Vulnerability**

In the vulnerable version, MD5 is used as the hashing algorithm for user credentials during signup, signin, and seed user creation. MD5 is fast and unsalted, so attackers can crack password hashes quickly with offline brute-force or rainbow tables.

<br>

This hardened implementation replaces fast unsalted hashing with bcrypt and verifies credentials using `bcrypt.compare`. It also seeds the seed user data with bcrypt to match. In addition, since the user credentials are no longer hard coded it pulls the password from an env variable. This is further explained in Vulnerability #6 - Part 4.

<br>

#### Vulnerability #2 - SQL Injection + User Scraping

---

**Vulnerable Code**

- Part 1/1: `PERN-app/vulnerable/backend/src/user-service.ts` (`searchUsers`)

<br>

`PERN-app/vulnerable/backend/src/user-service.ts`
```ts
export const searchUsers = async (searchTerm: string) => {
  const sql = `SELECT id, username FROM users WHERE username LIKE '%${searchTerm}%'`;
  const result = await query(sql);
  return result.rows;
};
```
<br>

**Hardened Code**

`PERN-app/hardened/backend/src/user-service.ts`
```ts
export const searchUsers = async (searchTerm: string) => {
  const normalizedSearchTerm = searchTerm.trim();
  if (normalizedSearchTerm.length < 3) {
    return [];
  }

  const escapedSearchTerm = normalizedSearchTerm.replace(/[\\%_]/g, "\\$&");

  const sql = `
    SELECT id, username
    FROM users
    WHERE username ILIKE $1
    ESCAPE '\\'
    ORDER BY username
    LIMIT 20
  `;
  const result = await query(sql, [`${escapedSearchTerm}%`]);
  return result.rows;
};
```

<br>

**Exploiting Vulnerability**

In this vulnerable implementation, the search term is directly concatenated into SQL (`WHERE username LIKE '%${searchTerm}%'`). That allows attackers to inject SQL syntax into the query text (for example, `' OR 1=1 --`) and alter the query behavior.

There are also no controls against broad enumeration. Very short terms (like a single character) can return large user lists, making user scraping easier.

<br>

This hardened implementation uses a parameterized query, so user input is handled as data rather than executable SQL.

It also adds controls to reduce scraping from broad probes: a `trim()` + minimum length check rejects short or empty search terms.

`LIMIT 20` caps returned rows, and `ORDER BY username` makes responses deterministic. The query uses a prefix pattern (`${escapedSearchTerm}%`) instead of a contains pattern (`%term%`) to reduce accidental overexposure.

`normalizedSearchTerm.replace(/[\\%_]/g, "\\$&")` is used with `ESCAPE '\\'` so user-provided `%` and `_` are treated literally rather than as wildcards.

Escaping backslashes in user input is also important because backslash is the SQL LIKE escape character in this query. Without escaping it, a trailing `\` could change how the appended `%` is interpreted.

<br>

#### Vulnerability #3 - Insecure Direct Object Reference

---

**Vulnerable Code**

- Part 1/1: `PERN-app/vulnerable/backend/src/index.ts` (`/profile/:id`)
<br>

**Hardened Code**

```ts
app.get(
  "/profile/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const profileIdToView = parseInt(req.params.id!, 10);
    const loggedInUserId = req.user?.id;

    if (!loggedInUserId || loggedInUserId !== profileIdToView) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const userProfile = await userService.findUserById(profileIdToView);
      if (!userProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json(userProfile);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);
```

This hardened implementation enforces object-level authorization by requiring the requested profile ID to match the authenticated user's ID.
<br>

**Exploiting Vulnerability**

In this vulnerable implementation, an authenticated user can modify the profile ID in the URL and access another user's profile data.
<br>

#### Vulnerability #4 - Overexposed Container Networking and Service Ports

---

**Vulnerable Code**

- Part 1/5 through Part 5/5: `PERN-app/vulnerable/docker-compose.yml`

<br>

**Hardened Code**

```yml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - public-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - db
    networks:
      - public-network
      - private-network

  db:
    image: postgres:17.5-bookworm
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    expose:
      - "5432"
    networks:
      - private-network

networks:
  public-network:
    driver: bridge
  private-network:
    driver: bridge
    internal: true
```

This hardened implementation segments container traffic and avoids publishing the database port to the host, so the database is reachable only from services on the private network.

<br>

**Exploiting Vulnerability**

In this vulnerable implementation, attackers can move laterally between services on a flat network, and the host-published database port increases direct attack surface against PostgreSQL.

<br>

#### Vulnerability #5 - Exposed Docker Socket

---

**Vulnerable Code**

- Part 1/1: `PERN-app/vulnerable/docker-compose.yml` (`/var/run/docker.sock:/var/run/docker.sock`)
<br>

**Hardened Code**

```yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    # No Docker socket mount.
    volumes:
      - ./backend:/usr/src/app
      - /usr/src/app/node_modules
```

This hardened implementation removes the Docker socket bind mount entirely, because application containers should not control the host Docker daemon.
<br>

**Exploiting Vulnerability**

In this vulnerable implementation, if an attacker gains code execution in the backend container, access to the Docker socket can allow control over the host Docker daemon.
<br>

#### Vulnerability #6 - Hardcoded Secrets and Credentials

---

**Vulnerable Code**

- Part 1/4: `PERN-app/vulnerable/backend/src/index.ts`  
- Part 2/4: `PERN-app/vulnerable/backend/src/db.ts`  
- Part 3/4: `PERN-app/vulnerable/docker-compose.yml`  
- Part 4/4: `PERN-app/vulnerable/backend/src/data/users.ts`

<br>

**Hardened Code**

`PERN-app/hardened/backend/src/index.ts`
```ts
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
```

`PERN-app/hardened/backend/src/db.ts`
```ts
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT ?? "5432"),
});
```

`PERN-app/hardened/docker-compose.yml`
```yml
services:
  backend:
    environment:
      JWT_SECRET: ${JWT_SECRET}
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      SEED_USER_PASSWORD: ${SEED_USER_PASSWORD}

  db:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
```

`PERN-app/hardened/backend/src/data/users.ts`
```ts
// Non-sensitive seed identities only. No credentials in source control.
export const usersToSeed = [
  { username: "alice" },
  { username: "bob" },
  { username: "charlie" },
];
```

`PERN-app/hardened/backend/src/index.ts`
```ts
const seedUserPassword = process.env.SEED_USER_PASSWORD;
if (!seedUserPassword) {
  throw new Error("SEED_USER_PASSWORD is required for local seed data");
}

for (const user of usersToSeed) {
  const hashedPassword = await bcrypt.hash(seedUserPassword, SALT_ROUNDS);
  await query(
    "INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING",
    [user.username, hashedPassword]
  );
}
```

This hardened implementation keeps secrets out of source code and image definitions while enabling safer rotation and environment-specific configuration. It also avoids storing seeded account credentials in plaintext source files.

<br>

**Exploiting Vulnerability**

In this vulnerable implementation, hardcoded secrets can be extracted from repository history, image metadata, or leaked config files and then reused for unauthorized access.

<br>

#### Vulnerability #7 - Missing Auth/API Hardening Controls

---

**Vulnerable Code**

- Part 1/3: `PERN-app/vulnerable/frontend/src/services/api.ts` (JWT persisted in `localStorage`)
- Part 2/3: `PERN-app/vulnerable/backend/src/index.ts` (missing security headers)
- Part 3/3: `PERN-app/vulnerable/backend/src/index.ts` (`/signin` has no brute-force protection)

<br>

**Hardened Code**

`PERN-app/hardened/backend/src/index.ts`
```ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

app.use(helmet());
app.use(cookieParser());

const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/signin", signinLimiter, async (req: Request, res: Response) => {
  const user = await userService.findUser(req.body);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { id: user.id, username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "Sign in successful",
    user: { id: user.id, username: user.username },
  });
});
```

`PERN-app/hardened/frontend/src/services/api.ts`
```ts
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
```

This hardened implementation removes token exposure from localStorage, adds browser-facing security headers, and applies sign-in throttling to reduce brute-force and credential-stuffing risk.

<br>

**Exploiting Vulnerability**

In this vulnerable implementation, an attacker can steal auth tokens via XSS, automate credential stuffing without throttling, and exploit missing browser-facing headers to increase attack surface.

<br>


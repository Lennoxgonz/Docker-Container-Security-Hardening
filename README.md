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

`cp .env.example .env`

Populate `.env` with real values for all required variables (`DB_USER`, `DB_NAME`, `DB_PASSWORD`, `JWT_SECRET`, and `SEED_USER_PASSWORD`) before starting containers.

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

To execute exploits, review why they are dangerous, and see the corresponding solutions. Check the section for the specific app you built and ran.

<br>
<br>

## Vulnerabilities Per App

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
const seedUserPassword = env.seedUserPassword;

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

This hardened implementation replaces fast unsalted hashing with bcrypt and verifies credentials using `bcrypt.compare` (Part 1/2). It also seeds the seed user data with bcrypt to match (Part 3). In addition, since the user credentials are no longer hard coded, it pulls the password from an env variable. This is further explained in Vulnerability #6 - Part 4.

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

`PERN-app/vulnerable/backend/src/index.ts`
```ts
app.get(
  "/profile/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const profileIdToView = parseInt(req.params.id!, 10);

    try {
      const userProfile = await userService.findUserById(profileIdToView);
      if (userProfile) {
        res.json(userProfile);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
```

<br>

**Hardened Code**

`PERN-app/hardened/backend/src/index.ts`
```ts
app.get(
  "/profile/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const profileIdToView = parseInt(req.params.id!, 10);
    if (!req.user || req.user.id !== profileIdToView) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    try {
      const userProfile = await userService.findUserById(profileIdToView);
      if (userProfile) {
        res.json(userProfile);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
```

<br>

**Exploiting Vulnerability**

In this vulnerable implementation, an authenticated user can modify the profile ID in the URL and access another user's profile data.

<br>

This hardened implementation enforces object-level authorization by requiring the requested profile ID to match the authenticated user's ID (`if (!req.user || req.user.id !== profileIdToView)`).

<br>


#### Vulnerability #4 - Overexposed Container Networking and Service Ports

---

**Vulnerable Code**

- Part 1/5 through Part 5/5: `PERN-app/vulnerable/docker-compose.yml`

```yml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      # Exposed for local demo access
      - '5173:5173'
    volumes:
    - ./frontend:/usr/src/app:ro
    - /usr/src/app/node_modules      
    depends_on:
      - backend
    networks:
    # Vulnerability #4 - Overexposed Container Networking and Service Ports
    # Part 1/5 - Frontend attached to same network as backend and db
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      # Exposed for local demo API access
      - '3000:3000'
    volumes:
    
    # Vulnerability #5 - Backend container mounts host Docker socket directly - Out of scope here, addressed in its own section
    - /var/run/docker.sock:/var/run/docker.sock

    - ./backend:/usr/src/app:ro
    - /usr/src/app/node_modules
    depends_on:
      - db
    networks:
    # Vulnerability #4 - Overexposed Container Networking and Service Ports
    # Part 2/5 - Backend attached to same network as frontend and db
      - app-network

  db:
    image: postgres:17.5-bookworm
    environment:
      # Vulnerability #6 - Postgres credentials stored as plaintext in compose - Out of scope here, addressed in its own section
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydatabase
    ports:
    # Vulnerability #4 - Overexposed Container Networking and Service Ports
    # Part 3/5 - Database service port is published to the host
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
    # Vulnerability #4 - Overexposed Container Networking and Service Ports
    # Part 4/5 - Db attached to same network as backend and frontend
      - app-network

networks:
  # Vulnerability #4 - Overexposed Container Networking and Service Ports
  # Part 5/5 - Single central network with all services attached to it
  app-network:
    driver: bridge
    
volumes:
  postgres-data:
  ```

<br>

**Hardened Code**

```yml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      # Exposed for local demo access
      - "5173:5173"
    volumes:
      - ./frontend:/usr/src/app:ro
      - /usr/src/app/node_modules
    depends_on:
      - backend
    networks:
      # Vulnerability #4 - Overexposed Container Networking and Service Ports
      # Part 1/5 - Frontend isolated from database network.
      - public-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      # Exposed for local demo API access
      - "3000:3000"
    volumes:
      # Vulnerability #5 - Backend container mounts host Docker socket directly - Out of scope here, addressed in its own section
      - /var/run/docker.sock:/var/run/docker.sock

      - ./backend:/usr/src/app:ro
      - /usr/src/app/node_modules
    depends_on:
      - db
    networks:
      # Vulnerability #4 - Overexposed Container Networking and Service Ports
      # Part 2/5 - Backend bridges public and private traffic boundaries.
      - public-network
      - private-network

  db:
    image: postgres:17.5-bookworm
    environment:
      # Vulnerability #6 - Postgres credentials stored as plaintext in compose - Out of scope here, addressed in its own section
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydatabase
    # Vulnerability #4 - Overexposed Container Networking and Service Ports
    # Part 3/5 - Database port is no longer published to host.
    expose:
      - "5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      # Vulnerability #4 - Overexposed Container Networking and Service Ports
      # Part 4/5 - Database attached only to private network.
      - private-network

networks:
  public-network:
    driver: bridge
  private-network:
    driver: bridge
    # Vulnerability #4 - Overexposed Container Networking and Service Ports
    # Part 5/5 - Internal-only network blocks external routing.
    internal: true

volumes:
  postgres-data:
```

<br>

**Exploiting Vulnerability**

The vulnerable version has various security issues.

Part 1/5 - The database is on the same network as the frontend. The frontend is internet facing and has a larger attack surface (npm dependencies and JS tooling). So this unnecessarily exposes the database to these risks as if an attacker compromises the frontend they will then be on the database network.

Part 2/5 - The backend is on one flat network with everything. In a flat network compromise of any service gives attackers lateral movement across services.

Part 4/5 (Skipping 3 as 1, 2, and 4 are very related) - Database is attached to a shared app network. This allows more communication to the database than necessary.

Part 3/5 - The database is published to host. This exposes the database beyond internal app use. So any process or user on host can attempt DB access.

Part 5/5 - There is a single central network, flat network topology like this allows one security breach to cascade across services.

This hardened code addresses Vulnerability #4 only (network segmentation and database port exposure). Vulnerability #5 and Vulnerability #6 are intentionally unchanged here and are remediated in their dedicated sections.

<br>

The hardened Docker Compose file has multiple fixes for these issues.

First, network segmentation is added. `public-network` and `private-network` are used, and the private network is set to private/internal `private-network.internal: true`. This directly resolves Part 5/5 and allows for part 1, 2, and 4 to be solved.

Second, the frontend is assigned to `public-network`, backend to `public-network` and `private-network`, and db to `private-network`. This addresses Part 1, 2, and 4.

Lastly, the host db exposure is addressed by replacing `ports: "5432:5432"` with `expose: "5432"`. This allows the db to be accessed by internal app traffic, but not host or external paths. This resolves Part 3/5.

<br>

#### Vulnerability #5 - Exposed Docker Socket

---

**Vulnerable Code**

- Part 1/1: `PERN-app/vulnerable/docker-compose.yml` 

<br>

PERN-app/vulnerable/docker-compose.yml
```yml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
    # Exposed for local demo access
      - "3000:3000"
    volumes:
      # Vulnerability #5 - Exposed Docker Socket
      # Part 1/1 - Backend container mounts host Docker socket directly.
      - /var/run/docker.sock:/var/run/docker.sock

      - ./backend:/usr/src/app:ro
      - /usr/src/app/node_modules
```

<br>

**Hardened Code**

```yml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
    # Exposed for local demo access
      - "3000:3000"
    volumes:
      # Vulnerability #5 - Exposed Docker Socket
      # Part 1/1 - Backend Docker socket mount removed.

      - ./backend:/usr/src/app:ro
      - /usr/src/app/node_modules
```

<br>

**Exploiting Vulnerability**

In this vulnerable implementation, the container is given access to the Docker daemon with (`/var/run/docker.sock:/var/run/docker.sock`). If an attacker gains code execution in the backend container, access to the Docker socket can allow control over the host Docker daemon. If remote code execution happens an attacker can read secrets and effectively escalate to compromising the host.

<br>

This hardened implementation removes the Docker socket bind mount entirely, because application containers should not control the host Docker daemon. Removing this mount prevents an attacker who compromises the backend from using Docker API to gain further access to the host/infrastructure.

<br>

#### Vulnerability #6 - Hardcoded Secrets and Credentials

---

**Vulnerable Code**

- Part 1/4: `PERN-app/vulnerable/backend/src/index.ts`  
```ts
const JWT_SECRET =
  "this-is-a-secret-key-that-should-be-in-an-env-file-or-secret-manager";
```

- Part 2/4: `PERN-app/vulnerable/backend/src/db.ts`
```ts
const pool = new Pool({
  user: "user",
  host: "db",
  database: "mydatabase",
  password: "password",
  port: 5432,
});
```

- Part 3/4: `PERN-app/vulnerable/docker-compose.yml`  
```yml
POSTGRES_USER: user
POSTGRES_PASSWORD: password
POSTGRES_DB: mydatabase
```

- Part 4/4: `PERN-app/vulnerable/backend/src/data/users.ts`
```ts
export const usersToSeed = [
  { username: "alice", password: "Gr@phQL$25" },
  { username: "bob", password: "BlueWh@le_1" },
  { username: "charlie", password: "Ch@rlieBr0wn!" },
  ...
];
```

<br>

**Hardened Code**

`PERN-app/hardened/.env.example`
```yml
DB_USER=your_postgres_user
DB_HOST=db
DB_NAME=your_database_name
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=replace_with_a_long_random_secret
SEED_USER_PASSWORD=replace_with_a_strong_seed_password
```

`PERN-app/hardened/backend/src/env.ts`
```ts
const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  dbUser: getRequiredEnv("DB_USER"),
  dbHost: process.env.DB_HOST ?? "db",
  dbName: getRequiredEnv("DB_NAME"),
  dbPassword: getRequiredEnv("DB_PASSWORD"),
  // Default to 5432, not really a secret just added to env for convenience
  dbPort: Number(process.env.DB_PORT ?? "5432"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  seedUserPassword: getRequiredEnv("SEED_USER_PASSWORD"),
};
```

`PERN-app/hardened/backend/src/index.ts`
```ts
const JWT_SECRET = env.jwtSecret;
```

`PERN-app/hardened/backend/src/db.ts`
```ts
const pool = new Pool({
  user: env.dbUser,
  host: env.dbHost,
  database: env.dbName,
  password: env.dbPassword,
  port: env.dbPort,
});
```

`PERN-app/hardened/docker-compose.yml`
```yml
env_file:
      - .env

POSTGRES_USER: ${DB_USER}
POSTGRES_PASSWORD: ${DB_PASSWORD}
POSTGRES_DB: ${DB_NAME}
```

`PERN-app/hardened/backend/src/data/users.ts`
```ts
export const usersToSeed = [
  { username: "alice" },
  { username: "bob" },
  { username: "charlie" },
  ...
];
```

`PERN-app/hardened/backend/src/index.ts`
```ts
const seedUserPassword = env.seedUserPassword;

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

In the vulnerable implementation, hardcoded secrets can be extracted from repository history, image metadata, or leaked config files and then used by an attacker for unauthorized access.

The hardened implementation keeps secrets like the JWT token, DB credentials, and seed user credentials in environment variables. These are stored in a `.env` file that is not tracked, with a corresponding `.env.example` file that is tracked to show what variables are needed. Additionally, an `env.ts` file was added to ensure the app fails quickly when the required variables are not provided.

These variables are then injected in the Docker Compose file and used in the code rather than hardcoded values. Additionally, user seeding logic was changed to use environment variables rather than hardcoded credentials.

While this works fine for local development, in a production app these environment variables would be injected by a secret manager at runtime. This would improve team workflows and security by avoiding storage of sensitive keys or credentials on local devices.

<br>

#### Vulnerability #7 - Missing Auth/API Hardening Controls

---

**Vulnerable Code**

- Part 1/3: `PERN-app/vulnerable/frontend/src/services/api.ts` (JWT persisted in `localStorage`)
```ts
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export const signIn = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signin", credentials);
  localStorage.setItem("token", data.token);
  return data;
};
```

- Part 2/3: `PERN-app/vulnerable/backend/src/index.ts` (missing security headers)
```ts
const app = express();
app.use(cors(corsOptions));
app.use(express.json());
```

- Part 3/3: `PERN-app/vulnerable/backend/src/index.ts` (`/signin` has no brute-force protection)
```ts
app.post("/signin", async (req: Request, res: Response) => {
  const user = await userService.findUser(req.body);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = { id: user.id, username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

  return res.status(200).json({
    message: "Sign in successful",
    token,
    user: { id: user.id, username: user.username },
  });
});
```

<br>

**Hardened Code**

`PERN-app/hardened/backend/src/index.ts`
```ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { parseSigninPayload } from "./types/dto";

app.use(helmet());
app.use(cookieParser());

const AUTH_COOKIE_NAME = "auth_token";
const isProduction = env.nodeEnv === "production";

const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/signin", signinLimiter, async (req: Request, res: Response) => {
  const signinPayload = parseSigninPayload(req.body);
  if (!signinPayload) {
    return res.status(400).json({ message: "Invalid credentials payload" });
  }

  try {
    const user = await userService.findUser(signinPayload);
    if (user) {
      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 60 * 60 * 1000,
      });
      res.status(200).json({
        message: "Sign in successful",
        user: { id: user.id, username: user.username },
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/signout", (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
  });
  res.status(200).json({ message: "Sign out successful" });
});

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (token == null) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (err: jwt.VerifyErrors | null, user: string | JwtPayload | undefined) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

      const verifiedUser = user as JwtPayload & { id?: number; username?: string };
      if (typeof verifiedUser.id !== "number" || typeof verifiedUser.username !== "string") {
        return res.status(403).json({ message: "Invalid token payload" });
      }

      req.user = { id: verifiedUser.id, username: verifiedUser.username };
      next();
    }
  );
};
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

export const signIn = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signin", credentials);
  return data;
};

export const signOut = async () => {
  const { data } = await apiClient.post("/signout");
  return data;
};
```

`PERN-app/hardened/frontend/src/components/Header.tsx`
```ts
import { getMainPageData, signOut } from "../services/api";

const handleSignOut = async () => {
  try {
    await signOut();
  } catch {
    // Continue local sign-out flow even if API sign-out fails.
  }
  setCurrentUser(null);
  navigate("/signin");
};
```

`PERN-app/hardened/backend/src/env.ts`
```ts
export const env = {
  dbUser: getRequiredEnv("DB_USER"),
  dbHost: process.env.DB_HOST ?? "db",
  dbName: getRequiredEnv("DB_NAME"),
  dbPassword: getRequiredEnv("DB_PASSWORD"),
  dbPort: Number(process.env.DB_PORT ?? "5432"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  seedUserPassword: getRequiredEnv("SEED_USER_PASSWORD"),
  nodeEnv: process.env.NODE_ENV ?? "development",
};
```

<br>

**Exploiting Vulnerability**

Part 1/3 - JWTs are stored in `localStorage` and then read by JavaScript for `Authorization` headers. If an attacker lands XSS in the frontend, they can read and exfiltrate the token, then replay it to access protected endpoints.

Part 2/3 - The backend is missing baseline browser-facing security headers. Without protections such as Helmet defaults, attackers have a larger browser-side attack surface and fewer defensive controls.

Part 3/3 - The sign-in endpoint has no brute-force protection. Attackers can automate high-volume credential guessing and credential-stuffing attempts with no throttling barrier.

<br>

The hardened implementation has multiple fixes for these issues.

First, token handling was moved out of JavaScript-controlled browser storage. The frontend no longer reads or writes JWTs in `localStorage`, no longer injects `Authorization` headers from a request interceptor, and now uses `withCredentials: true` so browser-managed cookies are sent automatically. On sign-in, the backend sets an `httpOnly` cookie (`auth_token`) instead of returning the token in the JSON response body. This directly addresses Part 1/3.

Second, auth session lifecycle handling was tightened. The backend now exposes a `/signout` route that clears the auth cookie, and the frontend header sign-out flow calls that endpoint before local redirect. This ensures sign-out is enforced server-side rather than only removing client-side state. This further supports Part 1/3 by hardening token lifecycle controls.

Third, browser and authentication hardening controls were added to the backend. `helmet()` adds baseline security headers and `cookie-parser` enables secure cookie-based token extraction in auth middleware. The security headers portion directly addresses Part 2/3.

Lastly, brute-force resistance was added on `/signin` with `express-rate-limit` (`signinLimiter`). This directly addresses Part 3/3. In addition, cookie security is environment-aware via `nodeEnv`, which keeps local development functional while preserving secure-cookie behavior in production and reinforces Part 1/3 protections.

<br>

### Flask App

This is a sample web application built in Python with the Flask framework.
Paths for this section: `flask-app/vulnerable` and `flask-app/hardened`.

#### Vulnerability #1 - Command Injection 

---

**Vulnerable Code**

`flask-app/vulnerable/app.py`

```python
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

```python
command_list = ['ping', '-c', '1', host]

try:
    # The command list is passed in, and 'shell=True' is removed
    result = subprocess.run(
        command_list, capture_output=True, text=True, timeout=10
    )
```

This code is hardened by the removal of the shell=True parameter. This makes it so characters like ; are not interpreted, which removes the ability of attackers to inject commands. Since the shell is not being used the command must be split up into a list.

In a production-level app where many commands may need to run, a command whitelist may also be used.
```python
if command_to_run not in ALLOWED_COMMANDS:
    return jsonify(error="Command not permitted"), 403
```

**Exploiting Vulnerability**

Attackers can pass in a parameter which will run the ping command. Then add a special character like ; (encoded as %3B) followed by a malicious command. This allows attackers to run commands directly on the container's shell.

* This will return the source code of the application.

`curl http://localhost:5000/api/ping?host=localhost%3Bcat%20app.py`

* This will return the username that the web server process is using inside the container. This reveals the container is running as root, which is vulnerability #4.

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

This Python image is up to date and pinned to a specific version, which improves reproducibility and reduces exposure to known issues compared with older or floating tags. Pinning ensures rebuilds stay consistent and helps prevent unexpected changes from newly published image variants.

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

```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()
name = "projects/hardened-app/secrets/API-key/versions/latest"
response = client.access_secret_version(name=name)
my_secret = response.payload.data.decode("UTF-8")
```

**Exploiting Vulnerability**

If a secret is stored directly in a project file, anyone with access to that file or the repository where it is stored can access that secret. In addition, the commands `docker history` and `docker inspect` can be used to access a secret that has been stored in an insecure manner. If an attacker gains shell access to a container they can use the `env` or `printenv` command to access all environment variables.

<br>

#### Vulnerability #4 - Running Container as Root User

---

**Vulnerable Code**

`flask-app/vulnerable/Dockerfile`

```yml
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

By default, Docker containers run as the root user. This is a significant security risk as if an attacker compromises a process inside the container, they would gain superuser privileges over that container. For this reason, a new, less privileged user should always be created and used.

**Hardened Code**

`flask-app/hardened/Dockerfile`

```yml
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser
```

This code adds a new user and gives it ownership over the /app so it can be used instead of the root user.

**Exploiting Vulnerability**

For an attacker to take advantage of this vulnerability, they would first have to find an entry point through another vulnerability in the application. This could be anything that allows for remote code execution. Something like vulnerability #1 would be an easy entry point for an attacker to start running commands on the container's shell. As a superuser they would have much more freedom as to how they could go about their attacks.

Once attackers have access to the container's shell as the root user they can run commands like apt-get. This can be used to download network scanners like nmap, password crackers like hashcat, packet sniffers like tcpdump, or any other tools attackers may find useful in their attack. 

Attackers would also gain full access to read and overwrite application source code. This would allow attackers to add more vulnerabilities or backdoors into the application.

As the root user, the attacker would also be well positioned to exploit a kernel-level vulnerability or another Docker misconfiguration to attempt a container escape. If successful, the attacker would gain access to the host machine and all containers running on that machine.

<br>
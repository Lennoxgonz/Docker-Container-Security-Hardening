import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { query } from "./db";
import * as userService from "./user-service";
import { usersToSeed } from "./data/users";
import { parseSearchTerm, parseSigninPayload, parseSignupPayload } from "./types/dto";

/**
 * Vulnerability #6 - Hardcoded Secrets and Credentials
 * Part 1/4 - JWT signing secret is hardcoded in backend source.
 * If this value leaks, attackers can forge valid tokens.
 */
const JWT_SECRET =
  "this-is-a-secret-key-that-should-be-in-an-env-file-or-secret-manager";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string };
    }
  }
}

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));
/**
 * Vulnerability #7 - Missing Auth/API Hardening Controls
 * Part 2/3 - Basic security headers middleware is missing (helmet/CSP/HSTS/frameguard).
 */
app.use(express.json());

app.post("/signup", async (req: Request, res: Response) => {
  const signupPayload = parseSignupPayload(req.body);
  if (!signupPayload) {
    return res.status(400).json({
      message:
        "Invalid signup data. Username must be at least 3 characters and password must be 8+ chars with uppercase, lowercase, number, and special character.",
    });
  }

  try {
    await userService.createUser(signupPayload);
    res.status(201).json({ message: "User sign up successful" });
  } catch {
    res.status(400).json({ message: "Username may already be taken." });
  }
});

app.post("/signin", async (req: Request, res: Response) => {
  /**
   * Vulnerability #7 - Missing Auth/API Hardening Controls
   * Part 3/3 - No brute-force protection on signin.
   * This route has no rate limit, lockout, or backoff.
   */
  const signinPayload = parseSigninPayload(req.body);
  if (!signinPayload) {
    return res.status(400).json({ message: "Invalid credentials payload" });
  }

  try {
    const user = await userService.findUser(signinPayload);
    if (user) {
      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
      res.status(200).json({
        message: "Sign in successful",
        token: token,
        user: { id: user.id, username: user.username },
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
});

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    const verifiedUser = user as JwtPayload & { id?: number; username?: string };
    if (typeof verifiedUser.id !== "number" || typeof verifiedUser.username !== "string") {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    req.user = { id: verifiedUser.id, username: verifiedUser.username };
    next();
  });
};

app.get("/search", authenticateToken, async (req: Request, res: Response) => {
  const searchTerm = parseSearchTerm(req.query.term);
  if (searchTerm === null) {
    return res.status(400).json({ message: "Search term is required" });
  }

  try {
    const users = await userService.searchUsers(searchTerm);
    res.json(users);
  } catch {
    res.status(500).json({ message: "Error during search" });
  }
});

app.get("/main", authenticateToken, (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});

/**
 * Vulnerability #3 - Insecure Direct Object Reference
 * Part 1/1 - Object-level authorization is missing on profile lookup.
 * Any authenticated user can request another user's profile by changing the URL id.
 */
app.get(
  "/profile/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const profileIdToView = parseInt(req.params.id!, 10);
    // This code does not check if the logged-in user's ID `req.user.id`
    // matches the ID from the URL `profileIdToView`

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

const startServer = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `;
    await query(createTableQuery);
    await query("TRUNCATE TABLE users RESTART IDENTITY;");

    /**
     * Vulnerability #1 - Insecure Password Hashing
     * Part 3/3 - Sample users are seeded with MD5.
     * Seed credentials use MD5, matching insecure login hashing.
     */
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

    app.listen(3000);
  } catch {
    process.exitCode = 1;
  }
};

startServer();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { query } from "./db";
import * as userService from "./user-service";
import { usersToSeed } from "./data/users";
import { parseSearchTerm, parseSigninPayload, parseSignupPayload } from "./types/dto";
import { env } from "./env";

const SALT_ROUNDS = 12;

/**
 * Vulnerability #6 - Hardcoded Secrets and Credentials
 * Part 1/4 - The hardcoded JWT secret has been replaced with an env variable
 */
const JWT_SECRET = env.jwtSecret;
const AUTH_COOKIE_NAME = "auth_token";
const isProduction = env.nodeEnv === "production";

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
  credentials: true,
};

app.use(cors(corsOptions));
/**
 * Vulnerability #7 - Missing Auth/API Hardening Controls
 * Part 2/3 - Basic security headers middleware is now enabled with Helmet.
 */
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

/**
 * Vulnerability #7 - Missing Auth/API Hardening Controls
 * Part 3/3 - Sign-in route now uses rate limiting to reduce brute-force attempts.
 */
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

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
 * Part 1/1 - The route now blocks cross-user profile access with an ownership check.
 */
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
     * Part 3/3 - MD5 has been replaced with bcrypt for seed user credentials.
     */
    const seedUserPassword = env.seedUserPassword;

    for (const user of usersToSeed) {
      const hashedPassword = await bcrypt.hash(seedUserPassword, SALT_ROUNDS);
      const seedQuery = {
        text: `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
        values: [user.username, hashedPassword],
      };
      await query(seedQuery.text, seedQuery.values);
    }

    app.listen(3000);
  } catch {
    process.exitCode = 1;
  }
};

startServer();

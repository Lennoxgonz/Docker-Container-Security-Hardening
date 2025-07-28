import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { query } from "./db";
import * as userService from "./userService";

const JWT_SECRET =
  "this-is-a-secret-key-that-should-be-in-an-env-file-or-secret-manager";
const SALT_ROUNDS = 10;

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string };
    }
  }
}

const app = express();

const allowedOrigins = [
  "https://5173-lennoxgonz-dockercontai-fsrei4975c5.ws-us120.gitpod.io",
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
app.use(express.json());

app.post("/signup", async (req: Request, res: Response) => {
  try {
    await userService.createUser(req.body);
    res.status(201).json({ message: "User signed up successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(400).json({ message: "Username may already be taken." });
  }
});

app.post("/signin", async (req: Request, res: Response) => {
  try {
    const user = await userService.findUser(req.body);
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
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/search", async (req: Request, res: Response) => {
  const searchTerm = req.query.term as string;

  if (!searchTerm && searchTerm !== "") {
    return res.status(400).json({ message: "Search term is required" });
  }

  try {
    const users = await userService.searchUsers(searchTerm);
    res.json(users);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Error during search" });
  }
});

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

app.get("/main", authenticateToken, (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});

/*
 * Vulnerability #3 - Broken Access Control
 * This endpoint is vulnerable because it checks that a user is authenticated
 * with `authenticateToken`, but it does not perform an authorization check
 * to ensure the logged-in user is the one whose profile is being requested
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
    } catch (error) {
      console.error("Profile access error:", error);
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
    console.log("Table 'users' is verified or created.");

    // Adding sample users for search functionality
    console.log("Seeding sample users...");
    const usersToSeed = [
      { username: "alice", password: "password123" },
      { username: "bob", password: "password123" },
      { username: "charlie", password: "password123" },
    ];

    for (const user of usersToSeed) {
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      const seedQuery = {
        text: `INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
        values: [user.username, hashedPassword],
      };
      await query(seedQuery.text, seedQuery.values);
    }
    console.log("Sample users seeded successfully.");

    app.listen(3000, () => {
      console.log(`Server running`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();

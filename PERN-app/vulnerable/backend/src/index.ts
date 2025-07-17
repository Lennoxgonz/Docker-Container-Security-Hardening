import express, { Request, Response } from "express";
import cors from "cors";
// import bcrypt from "bcrypt";
import { query } from "./db";
import * as userService from "./userService";
import { User } from "./types/user";

const app = express();

const allowedOrigins = [
  "https://5173-lennoxgonz-dockercontai-fsrei4975c5.ws-us120.gitpod.io",
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

// Test
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Running");
});

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
    // Vulnerability #1 - Insecure password hashing function
    const user = await userService.findUser(req.body);

    /* Hardened Version
    const { username, password } = req.body;
    const user = await userService.findUserByUsername(username); // You would need to uncomment this function in the service file
    if (user && (await bcrypt.compare(password, user.password))) {
      // Passwords match, sign in is successful
    }
    */

    if (user) {
      res.status(200).json({ message: "Sign in successful (insecure)" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Signin Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

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

    app.listen(3000, () => {
      console.log(`Server running on http://localhost:3000`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();

import { Pool } from "pg";

const pool = new Pool({
  user: "user",
  host: "db",
  database: "mydatabase",
  password: "password",
  port: 5432,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

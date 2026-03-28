import { Pool, QueryResultRow } from "pg";

/**
 * Vulnerability #6 - Hardcoded Secrets and Credentials
 * Part 2/4 - Database credentials hardcoded in backend source code.
 * Secrets are committed in code instead of being injected at deploy time.
 */
const pool = new Pool({
  user: "user",
  host: "db",
  database: "mydatabase",
  password: "password",
  port: 5432,
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => pool.query<T>(text, params);

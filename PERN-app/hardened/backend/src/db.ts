import { Pool, QueryResultRow } from "pg";
import { env } from "./env";

/**
 * Vulnerability #6 - Hardcoded Secrets and Credentials
 * Part 2/4 - The hardcoded pool values have been replaced with env variables
 */
const pool = new Pool({
  user: env.dbUser,
  host: env.dbHost,
  database: env.dbName,
  password: env.dbPassword,
  port: env.dbPort,
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => pool.query<T>(text, params);

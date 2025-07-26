import { query } from "./db";
import { User } from "./types/user";
import crypto from "crypto";

//Vulnerability #1 - Insecure Password Hashing Function
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

/* Hardened Versions
export const createUser = async (newUser: User) => {
  const { username, password } = newUser;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const sql = "INSERT INTO users (username, password) VALUES ($1, $2)";
  return query(sql, [username, hashedPassword]);
};

export const findUser = async (credentials: User) => {
  const { username, password } = credentials;
  const findUserSql = 'SELECT * FROM users WHERE username = $1';
  const result = await query(findUserSql, [username]);
  const user = result.rows[0];

  if (user && (await bcrypt.compare(password, user.password))) {
    return user;
  }
  return null;
};
*/

/**
 * VULNERABILITY #2 - SQL Injection
 * This function is intentionally vulnerable. It constructs a SQL query by
 * directly embedding the 'searchTerm' into the query string.
 * An attacker can provide a malicious string to alter the query's logic.
 */
export const searchUsers = async (searchTerm: string) => {
  const sql = `SELECT id, username FROM users WHERE username LIKE '%${searchTerm}%'`;
  const result = await query(sql);
  return result.rows;
};

/**
 * Hardened Version
 * This function is hardened against SQL injection by using parameterized queries.
 * The 'searchTerm' is passed as a separate parameter to the database driver,
 * which safely handles its inclusion in the query.

export const searchUsers = async (searchTerm: string) => {
  // The SQL query uses a placeholder (e.g., $1) instead of the raw variable.
  const sql = `SELECT id, username FROM users WHERE username LIKE $1`;

  // The variable is passed in an array as the second argument to the query function.
  // The database driver will safely substitute the placeholder with this value.
  const values = [`%${searchTerm}%`];
  
  const result = await query(sql, values);
  return result.rows;
};

*/

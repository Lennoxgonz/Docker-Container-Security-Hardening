import { query } from "./db";
import { AuthCredentialsDto } from "./types/dto";
import crypto from "crypto";

export const createUser = async (newUser: AuthCredentialsDto) => {
  /**
   * Vulnerability #1 - Insecure Password Hashing
   * Part 1/3 - Account creation hashes passwords with MD5.
   * MD5 is fast and easily cracked with modern hardware.
   */
  const { username, password } = newUser;
  const md5Hash = crypto.createHash("md5").update(password).digest("hex");
  const sql = "INSERT INTO users (username, password) VALUES ($1, $2)";
  return query(sql, [username, md5Hash]);
};

export const findUser = async (credentials: AuthCredentialsDto) => {
  /**
   * Vulnerability #1 - Insecure Password Hashing
   * Part 2/3 - Signin verification compares MD5-hashed credentials.
   * Fast hashing enables high-speed offline guessing attacks.
   */
  const { username, password } = credentials;
  const md5Hash = crypto.createHash("md5").update(password).digest("hex");
  const sql = "SELECT * FROM users WHERE username = $1 AND password = $2";
  const result = await query(sql, [username, md5Hash]);
  return result.rows[0];
};

/**
 * Vulnerability #2 - SQL Injection
 * Part 1/1 - Dynamic SQL string interpolation in search query.
 * User input is concatenated directly into SQL text.
 * Crafted input can alter query behavior.
 */
export const searchUsers = async (searchTerm: string) => {
  const sql = `SELECT id, username FROM users WHERE username LIKE '%${searchTerm}%'`;
  const result = await query(sql);
  return result.rows;
};

export const findUserById = async (id: number) => {
  const sql = "SELECT id, username FROM users WHERE id = $1";
  const result = await query(sql, [id]);
  return result.rows[0];
};

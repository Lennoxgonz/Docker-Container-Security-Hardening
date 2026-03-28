import { query } from "./db";
import { AuthCredentialsDto } from "./types/dto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const createUser = async (newUser: AuthCredentialsDto) => {
  /**
   * Vulnerability #1 - Insecure Password Hashing
   * Part 1/3 - MD5 has been replaced with bcrypt.
   */
  const { username, password } = newUser;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return query("INSERT INTO users (username, password) VALUES ($1, $2)", [
    username,
    hashedPassword,
  ]);
};

export const findUser = async (credentials: AuthCredentialsDto) => {
  /**
   * Vulnerability #1 - Insecure Password Hashing
   * Part 2/3 - MD5 has been replaced with bcrypt.
   */
  const { username, password } = credentials;
  const result = await query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  const user = result.rows[0];
  return user && (await bcrypt.compare(password, user.password)) ? user : null;
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

import { query } from "./db";
import { User } from "./types/user";
// import bcrypt from "bcrypt";
import crypto from "crypto";

//Vulnerability #1 - Insecure password hashing function

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

/* Vulnerabity #2 - SQL Injection

export const searchUsersVulnerable = async (searchTerm: string) => {
  const sql = `SELECT id, username FROM users WHERE username LIKE '%${searchTerm}%'`;
  console.log("Executing VULNERABLE search query:", sql);
  const result = await query(sql);
  return result.rows;
};

*/

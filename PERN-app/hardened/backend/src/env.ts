const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  dbUser: getRequiredEnv("DB_USER"),
  dbHost: process.env.DB_HOST ?? "db",
  dbName: getRequiredEnv("DB_NAME"),
  dbPassword: getRequiredEnv("DB_PASSWORD"),
  // Default to 5432, not really a secret just added to env for convenience
  dbPort: Number(process.env.DB_PORT ?? "5432"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  seedUserPassword: getRequiredEnv("SEED_USER_PASSWORD"),
};

export type AuthCredentialsDto = {
  username: string;
  password: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasStrongPassword = (password: string): boolean =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^a-zA-Z0-9]/.test(password);

export const parseSignupPayload = (payload: unknown): AuthCredentialsDto | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const username = payload.username;
  const password = payload.password;
  if (typeof username !== "string" || typeof password !== "string") {
    return null;
  }

  if (!/^[a-zA-Z0-9_]{3,}$/.test(username) || !hasStrongPassword(password)) {
    return null;
  }

  return { username, password };
};

export const parseSigninPayload = (payload: unknown): AuthCredentialsDto | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const username = payload.username;
  const password = payload.password;
  if (typeof username !== "string" || typeof password !== "string") {
    return null;
  }

  if (!username.trim() || !password.trim()) {
    return null;
  }

  return { username, password };
};

export const parseSearchTerm = (rawTerm: unknown): string | null => {
  if (typeof rawTerm !== "string") {
    return null;
  }

  return rawTerm;
};

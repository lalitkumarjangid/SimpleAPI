const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);

  if (!token || !user) return null;

  try {
    return { token, user: JSON.parse(user) };
  } catch {
    clearAuth();
    return null;
  }
}

export function saveAuth({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

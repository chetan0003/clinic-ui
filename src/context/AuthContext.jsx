import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { disableAuthenticator as disableAuthenticatorApi, enableAuthenticator as enableAuthenticatorApi, getUserClinics, login as loginApi, setupAuthenticator as setupAuthenticatorApi, verifyAuthenticatorLogin } from "../services/api";

const AuthContext = createContext(null);

function extractToken(data) {
  if (!data) return null;
  return (
    data.token ||
    data.accessToken ||
    data.jwt ||
    data.access_token ||
    data?.login?.token ||
    data?.login?.accessToken ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.login?.token ||
    null
  );
}

function extractUser(data, username) {
  const loginData = data?.login || data?.data?.login || data;
  const responseUser = data?.user || data?.data?.user;
  return (
    responseUser ||
    {
      username: loginData?.username || username,
      firstName: loginData?.firstName,
      lastName: loginData?.lastName,
      role: loginData?.role || loginData?.roles?.[0],
      roles: loginData?.roles,
      userId: loginData?.userId,
      clinicId: loginData?.clinicId,
    }
  );
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("clinicflow_token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("clinicflow_user")) || null;
    } catch {
      return null;
    }
  });
  const [profileLoading, setProfileLoading] = useState(() => Boolean(localStorage.getItem("clinicflow_token")));
  const [profileError, setProfileError] = useState("");
  const [pendingAuthChallenge, setPendingAuthChallenge] = useState(null);

  const refreshUser = useCallback(async () => {
    if (!token || !user?.username) {
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);
    setProfileError("");
    try {
      const result = await getUserClinics(user.username, token);
      const profile = result?.data?.user || result?.user || result?.data || result;
      if (!profile || typeof profile !== "object" || typeof profile.isPlanActive !== "boolean") {
        throw new Error("Unable to verify your clinic subscription status.");
      }

      const updatedUser = { ...user, ...profile };
      localStorage.setItem("clinicflow_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setProfileError(err.message || "Unable to verify your account access.");
      throw err;
    } finally {
      setProfileLoading(false);
    }
  }, [token, user?.username]);

  useEffect(() => {
    if (token && user?.username) {
      refreshUser().catch(() => {});
    } else {
      setProfileLoading(false);
    }
  }, [refreshUser, token, user?.username]);

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem("clinicflow_token");
      localStorage.removeItem("clinicflow_user");
      setToken(null);
      setUser(null);
      setProfileLoading(false);
      setProfileError("");
    }

    window.addEventListener("clinicflow:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("clinicflow:unauthorized", handleUnauthorized);
  }, []);

  async function login(username, password) {
    const data = await loginApi(username, password);
    const responseData = data?.data || data;
    if (responseData?.totpRequired) {
      if (!responseData.challengeToken) {
        throw new Error("Authenticator verification is required, but the login response did not include a challenge token.");
      }
      setPendingAuthChallenge({ challengeToken: responseData.challengeToken, username });
      return { totpRequired: true };
    }

    const newToken = extractToken(data);

    if (!newToken) {
      throw new Error(
        "Login succeeded but no token was found in the response. Please check the login API response format."
      );
    }

    const newUser = extractUser(data, username);
    setProfileLoading(true);
    setProfileError("");
    setPendingAuthChallenge(null);
    localStorage.setItem("clinicflow_token", newToken);
    localStorage.setItem("clinicflow_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    return data;
  }

  async function completeAuthenticatorLogin(code) {
    if (!pendingAuthChallenge?.challengeToken) {
      throw new Error("Your authenticator login session has expired. Sign in again.");
    }
    const data = await verifyAuthenticatorLogin(pendingAuthChallenge.challengeToken, code);
    const newToken = extractToken(data);
    if (!newToken) {
      throw new Error("Authenticator verification succeeded but no access token was returned.");
    }

    const newUser = extractUser(data, pendingAuthChallenge.username);
    setProfileLoading(true);
    setProfileError("");
    setPendingAuthChallenge(null);
    localStorage.setItem("clinicflow_token", newToken);
    localStorage.setItem("clinicflow_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return data;
  }

  function cancelAuthenticatorLogin() {
    setPendingAuthChallenge(null);
  }

  async function setupAuthenticator() {
    if (!token) throw new Error("Sign in again before setting up an authenticator.");
    return setupAuthenticatorApi(token);
  }

  async function enableAuthenticator(code) {
    if (!token) throw new Error("Sign in again before enabling an authenticator.");
    return enableAuthenticatorApi(code, token);
  }

  async function disableAuthenticator(password, code) {
    if (!token) throw new Error("Sign in again before disabling the authenticator.");
    return disableAuthenticatorApi(password, code, token);
  }

  function logout() {
    localStorage.removeItem("clinicflow_token");
    localStorage.removeItem("clinicflow_user");
    setToken(null);
    setUser(null);
    setProfileLoading(false);
    setProfileError("");
    setPendingAuthChallenge(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      profileLoading,
      profileError,
      pendingAuthChallenge,
      refreshUser,
      login,
      completeAuthenticatorLogin,
      cancelAuthenticatorLogin,
      setupAuthenticator,
      enableAuthenticator,
      disableAuthenticator,
      logout,
    }),
    [token, user, profileLoading, profileError, pendingAuthChallenge, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

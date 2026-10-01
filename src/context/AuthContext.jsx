import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getUserClinics, login as loginApi } from "../services/api";

const AuthContext = createContext(null);

function extractToken(data) {
  if (!data) return null;
  return (
    data.token ||
    data.accessToken ||
    data.jwt ||
    data.access_token ||
    data?.data?.token ||
    data?.data?.accessToken ||
    null
  );
}

function extractUser(data, username) {
  return (
    data?.user ||
    data?.data?.user ||
    {
      username: data?.username || username,
      firstName: data?.firstName,
      lastName: data?.lastName,
      role: data?.role || data?.roles?.[0],
      clinicId: data?.clinicId,
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
    const newToken = extractToken(data);

    if (!newToken) {
      throw new Error(
        "Login succeeded but no token was found in the response. Please check the login API response format."
      );
    }

    const newUser = extractUser(data, username);
    setProfileLoading(true);
    setProfileError("");
    localStorage.setItem("clinicflow_token", newToken);
    localStorage.setItem("clinicflow_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    return data;
  }

  function logout() {
    localStorage.removeItem("clinicflow_token");
    localStorage.removeItem("clinicflow_user");
    setToken(null);
    setUser(null);
    setProfileLoading(false);
    setProfileError("");
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      profileLoading,
      profileError,
      refreshUser,
      login,
      logout,
    }),
    [token, user, profileLoading, profileError, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

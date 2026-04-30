import { useEffect, useState } from 'react';
import { getAccessToken, getCurrentUser, loginUser, logoutUser } from '../api/authApi';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));

  async function refreshUser() {
    if (!getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      logoutUser();
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function login(loginData) {
    await loginUser(loginData);
    return refreshUser();
  }

  function logout() {
    logoutUser();
    setUser(null);
  }

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    let isActive = true;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();

        if (isActive) {
          setUser(currentUser);
        }
      } catch {
        logoutUser();

        if (isActive) {
          setUser(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isActive = false;
    };
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

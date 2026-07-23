import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const decodeToken = (token) => {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(normalized));
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    const claims = useMemo(() => decodeToken(token), [token]);

    return (
        <AuthContext.Provider value={{
            token,
            isAuthenticated: !!token,
            isAdmin: !!claims?.isAdmin,
            hasPassword: !!claims?.hasPassword,
            email: claims?.email || null,
            userId: claims?.id || null,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

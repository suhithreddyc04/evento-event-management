import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

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
    const [avatarUrl, setAvatarUrl] = useState(null);

    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setAvatarUrl(null);
    };

    const claims = useMemo(() => decodeToken(token), [token]);

    useEffect(() => {
        if (!token) {
            setAvatarUrl(null);
            return;
        }
        api.get('/profile')
            .then(response => setAvatarUrl(response.data.avatarUrl || null))
            .catch(() => setAvatarUrl(null));
    }, [token]);

    return (
        <AuthContext.Provider value={{
            token,
            isAuthenticated: !!token,
            isAdmin: !!claims?.isAdmin,
            role: claims?.role || 'client',
            isManager: !!claims?.isAdmin || claims?.role === 'manager',
            hasPassword: !!claims?.hasPassword,
            email: claims?.email || null,
            userId: claims?.id || null,
            avatarUrl,
            setAvatarUrl,
            login,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

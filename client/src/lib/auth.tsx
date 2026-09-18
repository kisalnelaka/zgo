'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'ADMIN' | 'DRIVER' | 'CUSTOMER';

export interface UserSession {
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  driverId?: string;
  orderId?: string;
}

interface AuthContextType {
  user: UserSession | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const PRESET_USERS: Record<UserRole, UserSession> = {
  ADMIN: {
    email: 'admin@zeego.qa',
    name: 'HQ Dispatcher',
    role: 'ADMIN',
    avatar: 'HQ',
  },
  DRIVER: {
    email: 'tariq.driver@zeego.qa',
    name: 'Captain Tariq Al-Mansoor',
    role: 'DRIVER',
    avatar: 'TA',
    driverId: 'driver_1',
  },
  CUSTOMER: {
    email: 'fatima.customer@zeego.qa',
    name: 'Fatima Al-Kuwari',
    role: 'CUSTOMER',
    avatar: 'FA',
    orderId: 'ZG-QTR-9021',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Load from localStorage or default to ADMIN for instant dev usability
    const saved = localStorage.getItem('zeego_auth_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        setUser(PRESET_USERS.ADMIN);
      }
    } else {
      setUser(PRESET_USERS.ADMIN);
    }
  }, []);

  const login = (role: UserRole) => {
    const selected = PRESET_USERS[role];
    setUser(selected);
    localStorage.setItem('zeego_auth_user', JSON.stringify(selected));

    if (role === 'ADMIN') router.push('/admin');
    else if (role === 'DRIVER') router.push('/rider');
    else router.push('/track/ZG-QTR-9021');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zeego_auth_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

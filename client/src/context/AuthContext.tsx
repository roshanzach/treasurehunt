import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDeviceId } from '../utils/device';

export interface TeamProfile {
  id: string;
  teamName: string;
  teamCode: string;
  currentLevel: number;
  isCompleted: boolean;
  isSuspended: boolean;
  status: string;
  isApproved: boolean;
  unlockedInventory?: Array<{
    level: number;
    accessKey: string;
    locationHintType: string;
    locationHintContent: string;
    locationHintMediaUrl: string | null;
    unlockedAt: string;
  }>;
}

export interface AdminProfile {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  role: 'ADMIN' | 'PARTICIPANT' | null;
  token: string | null;
  team: TeamProfile | null;
  admin: AdminProfile | null;
  isLoading: boolean;
  isDeviceApproved: boolean;
  deviceId: string;
  loginAdmin: (token: string, adminUser: AdminProfile) => void;
  loginTeam: (token: string, teamData: TeamProfile, isApproved: boolean) => void;
  setDeviceApproved: (approved: boolean) => void;
  updateTeamProfile: (partial: Partial<TeamProfile>) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('th_token'));
  const [role, setRole] = useState<'ADMIN' | 'PARTICIPANT' | null>(
    (localStorage.getItem('th_role') as any) || null
  );
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isDeviceApproved, setIsDeviceApproved] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const deviceId = getDeviceId();

  const refreshProfile = async () => {
    const storedToken = localStorage.getItem('th_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.role === 'ADMIN') {
          setRole('ADMIN');
          setAdmin(data.user);
          setTeam(null);
        } else if (data.role === 'PARTICIPANT') {
          setRole('PARTICIPANT');
          setTeam(data.team);
          setIsDeviceApproved(data.team.isApproved);
          setAdmin(null);
        }
      } else {
        // Token invalid
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const loginAdmin = (newToken: string, adminUser: AdminProfile) => {
    localStorage.setItem('th_token', newToken);
    localStorage.setItem('th_role', 'ADMIN');
    setToken(newToken);
    setRole('ADMIN');
    setAdmin(adminUser);
    setTeam(null);
  };

  const loginTeam = (newToken: string, teamData: TeamProfile, approved: boolean) => {
    localStorage.setItem('th_token', newToken);
    localStorage.setItem('th_role', 'PARTICIPANT');
    setToken(newToken);
    setRole('PARTICIPANT');
    setTeam(teamData);
    setIsDeviceApproved(approved);
    setAdmin(null);
  };

  const setDeviceApproved = (approved: boolean) => {
    setIsDeviceApproved(approved);
    if (team) {
      setTeam({ ...team, isApproved: approved });
    }
  };

  const updateTeamProfile = (partial: Partial<TeamProfile>) => {
    if (team) {
      setTeam({ ...team, ...partial });
    }
  };

  const logout = () => {
    localStorage.removeItem('th_token');
    localStorage.removeItem('th_role');
    setToken(null);
    setRole(null);
    setTeam(null);
    setAdmin(null);
    setIsDeviceApproved(false);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        token,
        team,
        admin,
        isLoading,
        isDeviceApproved,
        deviceId,
        loginAdmin,
        loginTeam,
        setDeviceApproved,
        updateTeamProfile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

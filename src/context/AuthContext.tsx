"use client";
import { createContext, useContext } from "react";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  position: string;
  role: string;
  badge: string;
  permissions: {
    can_edit?: string[];
    profile_editable?: boolean;
  };
  profile_pic_url: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

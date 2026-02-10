"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  getIdToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up"];

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Client-side route protection
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(r + "/")
    );

    if (!user && !isPublic) {
      router.replace("/sign-in");
    }
    if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
      router.replace("/home");
    }
  }, [user, loading, pathname, router]);

  const handleSignOut = async () => {
    await firebaseSignOut(auth);
    router.replace("/sign-in");
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signOut: handleSignOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

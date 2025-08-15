"use client";
import { authManager } from "@/lib/auth-manager";
import React, { createContext, useContext, ReactNode, useSyncExternalStore } from "react";

interface AuthContextProps {
    accessToken: string | null;
    currentUser: ReturnType<typeof authManager.getUser>;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    registerUser: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

    const accessToken = useSyncExternalStore(
        authManager.subscribe.bind(authManager),
        () => authManager.getToken(),
        () => null
    );

    const currentUser = useSyncExternalStore(
        authManager.subscribe.bind(authManager),
        () => authManager.getUser(),
        () => null
    );

    if (authManager.isInitializing()) {
        throw authManager.hydrationPromise;
    }

    const contextValue: AuthContextProps = {
        accessToken,
        currentUser,
        isAuthenticated: Boolean(currentUser),
        signIn: authManager.signIn.bind(authManager),
        signOut: authManager.signOut.bind(authManager),
        registerUser: authManager.registerUser.bind(authManager),
    };

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};


/**
 * Root Layout Component
 * 
 * The main layout wrapper for the entire application.
 * Provides global providers including AuthProvider for authentication state.
 * Configures global metadata, CSS, and toast notifications.
 * Wraps all pages with authentication context and global styling.
 */

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Ryoko - Plan Together, Travel Better",
  description: "Collaborative travel planning platform for group travelers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          containerStyle={{
            zIndex: 10000, // Higher than modal z-index (9999)
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '14px',
              zIndex: 10000, // Higher than modal z-index (9999)
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

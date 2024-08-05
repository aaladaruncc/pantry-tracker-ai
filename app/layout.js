import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./auth/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Pantry Tracker",
  description: "Any recipe, any time."
};

export default function RootLayout({ children }) {
  return (
      <html lang="en">
        <body className={inter.className}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </body>
      </html>
  );
}

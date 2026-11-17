// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import RootClient from "./RootClient"; // Import Client Component

// Inter is the mobile app's only typeface; next/font downloads it at build time and serves it
// from this origin, so no request leaves for a font host at runtime.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArtVista Portal",
  description: "Vista Technologies BV",
  icons: {
    icon: "/favicon.png",
  },
};

// Applies the saved theme before the first paint: "light", "dark", or the system's choice.
// Kept in sync with src/components/header/ThemeSwitch.tsx.
const themeScript = `(function(){var t="dark";try{var s=localStorage.getItem("artvista-theme");if(s==="light")t="light";else if(s==="system")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){}document.documentElement.dataset.theme=t})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}

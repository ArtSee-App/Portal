import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { UserProvider } from "@/context/UserContext";
import AppWrapper from "./AppWrapper"; // Import client component wrapper
import { AlertProvider } from "@/context/AlertContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ArtVista Portal",
  description: "Vista Technologies BV",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <UserProvider>
          <AlertProvider>
            <AppWrapper>{children}</AppWrapper>
          </AlertProvider>
        </UserProvider>
      </body>
    </html>
  );
}

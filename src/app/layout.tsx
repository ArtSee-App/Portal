import type { Metadata } from "next";
import localFont from "next/font/local";
import { UserProvider } from "@/context/UserContext"; // Import your context provider
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}

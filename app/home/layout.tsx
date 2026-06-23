import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Game Developer Tools Home",
  description: "Powered by: AtrOS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={lexend.variable}
    >
      <body>{children}</body>
    </html>
  );
}
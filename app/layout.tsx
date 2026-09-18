import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thrivar",
  description:
    "A personal transformation system that brings your inner world, direction, decisions, and growth into one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}

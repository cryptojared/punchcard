import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Punchcard — Loyalty Cards for Local Businesses",
  description: "The simplest digital loyalty card. Customers scan, you punch, they come back. No app downloads. Just scan and go.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}

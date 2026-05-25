import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./app-shell";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <Toaster 
          position="bottom-right"
          richColors
        />
      </body>
    </html>
  );
}

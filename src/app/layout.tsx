import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DogBomb",
  description: "Your dog photobombs every photo you take",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DogBomb",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-900 overflow-hidden">{children}</body>
    </html>
  );
}

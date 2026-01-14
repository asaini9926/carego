import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carego",
  description: "Healthcare Staffing & Training OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
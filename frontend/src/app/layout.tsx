import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cultivo Manager - Administración de Cultivo Casero",
  description: "Sistema de administración y monitoreo de cultivo indoor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-cultivo-darker text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}


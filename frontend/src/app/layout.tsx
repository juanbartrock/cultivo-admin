import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SocketProvider } from "@/contexts/SocketContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { DialogProvider } from "@/contexts/DialogContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { AIAssistantBubble } from "@/components/ai-assistant";
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
        <AuthProvider>
          <ToastProvider>
            <DialogProvider>
              <SocketProvider>
                <AIAssistantProvider>
                  {children}
                  <AIAssistantBubble />
                </AIAssistantProvider>
              </SocketProvider>
            </DialogProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


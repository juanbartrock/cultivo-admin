import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { SocketProvider } from "@/contexts/SocketContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { DialogProvider } from "@/contexts/DialogContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { AIAssistantBubble } from "@/components/ai-assistant";
import { AppQueryProvider } from "@/providers/AppQueryProvider";
import { AppShell } from "@/components/shell";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
      <body
        className={`${manrope.className} ${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <AppQueryProvider>
          <AuthProvider>
            <ToastProvider>
              <DialogProvider>
                <SocketProvider>
                  <AIAssistantProvider>
                    <AppShell>{children}</AppShell>
                    <AIAssistantBubble />
                  </AIAssistantProvider>
                </SocketProvider>
              </DialogProvider>
            </ToastProvider>
          </AuthProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import {  Ubuntu_Mono } from "next/font/google";
import "../globals.css";
import TrackingScripts from "@/components/TrackingScripts"; // <-- importa seu novo componente
import { Providers } from "@/providers/Providers";

const ubuntu = Ubuntu_Mono({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: "400"
});

export const metadata: Metadata = {
  title: "Flynance Cadastro",
  description: "Simplifique sua vida financeira com a Flynance. Controle seus gastos, acompanhe seu saldo e receba insights inteligentes para alcançar seus objetivos financeiros.",
  icons: "../favicon.ico"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${ubuntu.variable}`}>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MR4HDQL9"
        height="0" width="0"  style={{ display: 'none', visibility: 'hidden' }}></iframe></noscript>
        <TrackingScripts />
        <Providers>
            {children}
        </Providers>
      </body>
    </html>
  );
}

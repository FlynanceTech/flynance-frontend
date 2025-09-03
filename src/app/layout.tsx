import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TrackingScripts from "@/components/TrackingScripts";
import PWARegister from "@/components/PWARegister";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import PWAInstallListener from "@/components/PWAInstallListener";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flynance",
  description:
    "Simplifique sua vida financeira com a Flynance. Controle seus gastos, acompanhe seu saldo e receba insights inteligentes para alcançar seus objetivos financeiros.",
  icons: "/src/app/favicon.ico",
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.variable}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MR4HDQL9"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
          <PWAInstallListener />
          <PWARegister/>
          <TrackingScripts />
          {children}
          <Analytics />
          <SpeedInsights />
      </body>
    </html>  
  );
}

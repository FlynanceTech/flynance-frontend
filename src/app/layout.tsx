import type { Metadata } from "next";
import {  Ubuntu } from "next/font/google";
import "./globals.css";
import PushNotificationBootstrap from "@/components/PushNotificationBootstrap";
import TrackingScripts from "@/components/TrackingScripts";
import PWARegister from "@/components/PWARegister";
import PWAInstallListener from "@/components/PWAInstallListener";
import { Providers } from "@/providers/Providers";
import { IntlProvider } from "@/providers/IntlProvider";
import ThemeScopeController from "@/components/ThemeScopeController";
import CookieConsentProvider from "@/components/cookies/CookieConsentProvider";
import GatedAnalytics from "@/components/cookies/GatedAnalytics";


const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ubuntu",
});


export const metadata: Metadata = {
  title: "Flynance",
  description:
    "Simplifique sua vida financeira com a Flynance. Controle seus gastos, acompanhe seu saldo e receba insights inteligentes para alcançar seus objetivos financeiros.",
  icons: "../favicon.ico",
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" className={`${ubuntu.variable}`} suppressHydrationWarning>
      <body >
          <PWAInstallListener />
          <PWARegister/>
          <PushNotificationBootstrap />
          <CookieConsentProvider>
            <TrackingScripts />
            <ThemeScopeController />
            <Providers>
              <IntlProvider>{children}</IntlProvider>
            </Providers>
            <GatedAnalytics />
          </CookieConsentProvider>
      </body>
    </html>  
  );
}

import type { Metadata } from "next";
import {  Ubuntu } from "next/font/google";
import "./globals.css";
import PushNotificationBootstrap from "@/components/PushNotificationBootstrap";
import TrackingScripts from "@/components/TrackingScripts";
import PWARegister from "@/components/PWARegister";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import PWAInstallListener from "@/components/PWAInstallListener";
import { Providers } from "@/providers/Providers";
import { IntlProvider } from "@/providers/IntlProvider";
import ThemeScopeController from "@/components/ThemeScopeController";


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
    <html lang="pt-BR" className={`${ubuntu.variable}`}>
      <body >
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
          <PushNotificationBootstrap />
          <TrackingScripts />
          <ThemeScopeController />
          <Providers>
            <IntlProvider>{children}</IntlProvider>
          </Providers>
          <Analytics />
          <SpeedInsights />
      </body>
    </html>  
  );
}

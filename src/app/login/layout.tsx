import type { Metadata } from "next";
import "../globals.css";
import TrackingScripts from "@/components/TrackingScripts"; // <-- importa seu novo componente
import { Providers } from "@/providers/Providers";
import FeedbackWidget from "@/components/widgets/feedback";

export const metadata: Metadata = {
  title: "Flynance Login",
  description: "Simplifique sua vida financeira com a Flynance. Controle seus gastos, acompanhe seu saldo e receba insights inteligentes para alcançar seus objetivos financeiros.",
  icons: "../favicon.ico"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div >
      <TrackingScripts />
      <Providers>
          {children}
      </Providers>
      <FeedbackWidget />
    </div>
  );
}

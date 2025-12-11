import type { Metadata } from "next";
import "../globals.css";
import TrackingScripts from "@/components/TrackingScripts"; // <-- importa seu novo componente
import { Providers } from "@/providers/Providers";


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
    <div>
      <TrackingScripts />
      <Providers>
          {children}
      </Providers>
    </div>
  );
}

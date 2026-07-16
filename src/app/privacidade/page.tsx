import type { Metadata } from "next";
import LegalDocView from "@/components/legal/LegalDocView";

export const metadata: Metadata = {
  title: "Política de Privacidade | Flynance",
  description: "Política de Privacidade da Flynance Tecnologia, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return <LegalDocView docKey="privacidade" />;
}

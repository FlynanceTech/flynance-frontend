import type { Metadata } from "next";
import LegalDocView from "@/components/legal/LegalDocView";

export const metadata: Metadata = {
  title: "Termos de Uso | Flynance",
  description: "Termos de Uso da Flynance Tecnologia.",
};

export default function TermosPage() {
  return <LegalDocView docKey="termos" />;
}

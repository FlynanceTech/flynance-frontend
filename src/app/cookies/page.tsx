import type { Metadata } from "next";
import LegalDocView from "@/components/legal/LegalDocView";

export const metadata: Metadata = {
  title: "Política de Cookies | Flynance",
  description: "Política de Cookies da Flynance Tecnologia.",
};

export default function CookiesPage() {
  return <LegalDocView docKey="cookies" />;
}

import type { Metadata } from "next";
import { PanelShell } from "@/components/shell";

export const metadata: Metadata = { title: "Taller" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}

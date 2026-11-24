import type { Metadata, Viewport } from "next";
import { Manrope, Oswald } from "next/font/google";
import "./globals.css";

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const display = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: {
    default: "Doctor Play · Taller",
    template: "%s · Doctor Play",
  },
  description: "Reparaciones, fichajes, cuentas y presupuestos del taller Doctor Play.",
};

export const viewport: Viewport = {
  themeColor: "#07080f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

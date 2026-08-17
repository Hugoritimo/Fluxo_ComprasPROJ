import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Projeta Compras",
    template: "%s | Projeta Compras",
  },

  description:
    "Sistema corporativo para gestão de pedidos de compra e cartões.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
import type {
  Metadata,
} from "next";

import {
  Geist_Mono,
  Manrope,
} from "next/font/google";

import "./globals.css";

// ============================================================
// FONTES
// ============================================================

const manrope =
  Manrope({
    subsets: [
      "latin",
    ],

    variable:
      "--font-manrope",

    display:
      "swap",

    preload:
      true,
  });

const geistMono =
  Geist_Mono({
    subsets: [
      "latin",
    ],

    variable:
      "--font-geist-mono",

    display:
      "swap",

    preload:
      true,
  });

// ============================================================
// METADATA
// ============================================================

export const metadata: Metadata = {
  title: {
    default:
      "Projeta Compras",

    template:
      "%s | Projeta Compras",
  },

  description:
    "Sistema corporativo para gestão de pedidos de compra e cartões.",
};

// ============================================================
// ROOT LAYOUT
// ============================================================

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
    >
      <body
        className={[
          manrope.variable,
          geistMono.variable,
          "font-sans antialiased",
        ].join(
          " "
        )}
      >
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PRODUCT_NAME, PRODUCT_STATEMENT } from "@/lib/bevofix";

import "./globals.css";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | Campus AI Triage`,
  description: PRODUCT_STATEMENT,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

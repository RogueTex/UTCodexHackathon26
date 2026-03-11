import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PRODUCT_NAME, PRODUCT_STATEMENT, PRODUCT_TAGLINE } from "@/lib/bevofix";

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
      <body>
        <div className="site-shell">
          <header className="site-header">
            <Link href="/landing" className="brand-mark">
              <span className="brand-kicker">Campus AI triage</span>
              <strong>{PRODUCT_NAME}</strong>
              <span className="brand-horns" aria-hidden="true" />
            </Link>
            <div className="header-copy">
              <span>{PRODUCT_TAGLINE}</span>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

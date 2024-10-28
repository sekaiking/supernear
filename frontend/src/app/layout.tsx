import type { Metadata } from "next";
import { Archivo } from "next/font/google";

import "@near-wallet-selector/modal-ui/styles.css";
import "@/styles/index.scss";
import "@chatui/core/dist/index.css";

import Providers from "./providers";
import Script from "next/script";
import Navbar from "@/components/layout/navbar";
import styles from "./layout.module.scss";

const font = Archivo({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Supernear",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <body className={`${font.className}`}>
        <Script src="/icons.min.js" />
        <Providers>
          <div className={styles.layout}>
            <Navbar />
            <main className={styles.main}>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

// Making sure envs are set
if (!process.env.NEXT_PUBLIC_NEAR_RPC) {
  throw "NEXT_PUBLIC_NEAR_RPC env is not defined";
}
if (!process.env.NEXT_PUBLIC_PREMIUM_CONTRACT) {
  throw "NEXT_PUBLIC_PREMIUM_CONTRACT env is not defined";
}

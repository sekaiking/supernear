"use client";
import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { getCrossTabState } from "@/hooks/useCrossState";
import { Toaster } from "react-hot-toast";
import { WalletSelectorContextProvider } from "@/hooks/useWalletSelector";
import { AuthContextProvider } from "@/hooks/useAuth";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletSelectorContextProvider>
        <AuthContextProvider>{children}</AuthContextProvider>
      </WalletSelectorContextProvider>
      <Toaster position="top-center" gutter={12} />
    </ThemeProvider>
  );
}

export function getSignedAccountId(): string | undefined {
  return getCrossTabState("signedAccountId");
}

"use client";
import { networkId } from "@/config";
import { log } from "@/utils/log";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import {
  AccountState,
  setupWalletSelector,
  WalletSelector,
  WalletSelectorState,
} from "@near-wallet-selector/core";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import {
  setupModal,
  WalletSelectorModal,
} from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupNightly } from "@near-wallet-selector/nightly";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CONTRACT_ID = process.env.NEXT_PUBLIC_PREMIUM_CONTRACT!;

interface WalletSelectorContextValue {
  selector: WalletSelector;
  modal: WalletSelectorModal;
  accounts: Array<AccountState>;
  accountId: string | null;
}

const WalletSelectorContext = createContext<WalletSelectorContextValue | null>(
  null,
);

export const WalletSelectorContextProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<Array<AccountState>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const init = useCallback(async () => {
    log("initializing @near-wallet-selector and modal ui");
    const callbackURL = new URL(location.href);
    const _selector = await setupWalletSelector({
      network: networkId,
      debug: true,
      modules: [
        setupMyNearWallet({
          successUrl: callbackURL.toString(),
        }),
        // setupSender(),
        setupMeteorWallet(),
        setupHereWallet(),
        setupBitteWallet({
          successUrl: callbackURL.toString(),
          callbackUrl: callbackURL.toString(),
          contractId: CONTRACT_ID,
        }),
        setupNightly(),
      ] as any,
    });
    const _modal = setupModal(_selector, {
      contractId: CONTRACT_ID,
    });
    const state = _selector.store.getState();
    setAccounts(state.accounts);
    setSelector(_selector);
    setModal(_modal);
    setLoading(false);
  }, []);

  useEffect(() => {
    init().catch((err) => {
      console.error(err);
      alert("Failed to initialise wallet selector");
    });
  }, []);

  useEffect(() => {
    if (!selector) {
      return;
    }

    const subscription = selector.store.observable.subscribe(
      (state: WalletSelectorState) => {
        log("Accounts Update", state.accounts);
        setAccounts(state.accounts);
      },
    );

    const onSignedIn = selector.on("signedIn", (params) => {
      log("Signed In", params);
    });

    const onSignedOut = selector.on("signedOut", (params) => {
      log("Signed In", params);
    });

    const onAccountChange = selector.on("accountsChanged", (params) => {
      log(`Accounts Changed`, params);
    });

    return () => {
      subscription.unsubscribe();
      onAccountChange.remove();
      onSignedIn.remove();
      onSignedOut.remove();
    };
  }, [selector, modal]);

  const walletSelectorContextValue = useMemo<WalletSelectorContextValue>(
    () => ({
      selector: selector!,
      modal: modal!,
      accounts,
      accountId: accounts.find((account) => account.active)?.accountId || null,
    }),
    [selector, modal, accounts],
  );

  return (
    <WalletSelectorContext.Provider value={walletSelectorContextValue}>
      {children}
    </WalletSelectorContext.Provider>
  );
};

export function useWalletSelector() {
  const context = useContext(WalletSelectorContext);

  if (!context) {
    throw new Error(
      "useWalletSelector must be used within a WalletSelectorContextProvider",
    );
  }

  return context;
}

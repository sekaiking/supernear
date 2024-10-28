"use client";
import { SignMessageParams } from "@near-wallet-selector/core";
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios, { AxiosResponse } from "axios";
import { isSignedInWithServer } from "@/utils/auth";
import toast from "react-hot-toast";
import { useWalletSelector } from "@/hooks/useWalletSelector";
import { near_view } from "@/utils/near_view";

interface AuthContextValue {
  signout: () => Promise<AxiosResponse<any, any>>;
  verifyOwnership: () => void;
  verified: boolean | null;
  loading: boolean;
  syncUserPlan: () => void;
  userPlan?: {
    subscription_ends: Date;
  } | null;
  pro?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getUserPlan(accountId: string): Promise<{
  subscription_ends: string;
}> {
  return near_view(
    process.env.NEXT_PUBLIC_PREMIUM_CONTRACT!,
    "get_user_subscription",
    {
      name: "premium",
      user_id: accountId,
    },
  );
}

// Browser Wallets Should Redirect Here After First Connect and When Signing Nonce
export const AuthContextProvider: FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [userPlan, setUserPlan] = useState<
    | {
        subscription_ends: Date;
      }
    | null
    | undefined
  >(undefined);
  const { accountId, selector } = useWalletSelector();

  const pro =
    userPlan?.subscription_ends && userPlan.subscription_ends > new Date();

  useEffect(() => {
    syncUserPlan();
  }, [accountId]);

  const syncUserPlan = useCallback(() => {
    if (accountId) {
      getUserPlan(accountId).then((v) => {
        if (v?.subscription_ends) {
          const se = Number(v.subscription_ends);
          setUserPlan({
            ...v,
            subscription_ends: new Date(se),
          });
        } else {
          setUserPlan(null);
        }
      });
    }
  }, [accountId]);

  // It gets a message to sign from the server, then prompts the user wallet to sign it
  const verifyOwnership = useCallback(async () => {
    if (!accountId) {
      throw "Connect to a wallet first";
    }
    const wallet = await selector.wallet();

    const {
      data: { signParams },
    } = await axios.post(process.env.NEXT_PUBLIC_SUPER_API + "/auth/nonce", {
      accountId: accountId,
    });

    // if using a web wallet, we need to store the message somewhere
    if (wallet.type === "browser") {
      localStorage.setItem(
        "super-near-login-message",
        JSON.stringify({
          ...signParams,
          callbackUrl: location.href,
        }),
      );
    }

    try {
      const signedMessage = await wallet.signMessage({
        ...signParams,
        nonce: Buffer.from(signParams.nonce, "base64"),
      });
      if (signedMessage) {
        confirmOwnershipWithServer(
          signParams,
          signedMessage.signature,
          signedMessage.publicKey,
          signedMessage.accountId,
        );
      }
    } catch (err) {
      setVerified(false);
      toast.error(
        "Couldn't sign message to verify ownership. \nReason: " + err,
      );
    }
  }, [accountId, selector]);

  const verifyOwnershipIfNeeded = () => {
    if (typeof window == "undefined") {
      return;
    }
    if (!accountId) {
      return;
    }

    const isReallySignedIn = isSignedInWithServer(accountId);

    // User connected wallet but didn't verify ownership
    if (!isReallySignedIn) {
      const urlParams = new URLSearchParams(
        window.location.hash.substring(1), // skip the first char (#)
      );
      const accId = urlParams.get("accountId") as string;
      const publicKey = urlParams.get("publicKey") as string;
      const signature = urlParams.get("signature") as string;

      // If we already called onRealSignIn and this is a callback from a browser wallet then do nothing
      if (!(!accId && !publicKey && !signature)) {
        return;
      }

      verifyOwnership();
    }
  };

  // it sends the signature to the server, which return auth cookies
  const confirmOwnershipWithServer = useCallback(
    async (
      { message, nonce, recipient, callbackUrl }: SignMessageParams,
      signature: string,
      publicKey: string,
      accountId: string,
    ) => {
      const isReallySignedIn = isSignedInWithServer(accountId);

      // User connected wallet but didn't verify ownership
      if (!isReallySignedIn) {
        axios
          .post(
            process.env.NEXT_PUBLIC_SUPER_API + "/auth/signin",
            {
              signature,
              message,
              nonce,
              recipient,
              publicKey,
              accountId,
              callbackUrl,
            },
            {
              withCredentials: true,
            },
          )
          .then((r) => {
            if (r.data.success) {
              if (isSignedInWithServer(accountId)) {
                setVerified(true);
              }
            }
          })
          .catch((e) => {
            setVerified(false);
            toast.error(
              `Something went wrong, make sure to sign the message using full access keys.\nError: ${e.response.data.error}`,
            );
          });
      }
    },
    [],
  );

  // It checks if there is a callback from browser wallet, then pass it to the server
  const handleVerifyOwnershipBrowserWalletResponse = useCallback(async () => {
    const urlParams = new URLSearchParams(
      window.location.hash.substring(1), // skip the first char (#)
    );
    const accId = urlParams.get("accountId") as string;
    const publicKey = urlParams.get("publicKey") as string;
    const signature = urlParams.get("signature") as string;

    if (!accId && !publicKey && !signature) {
      return;
    }

    const message: SignMessageParams & {
      nonce: string;
    } = JSON.parse(localStorage.getItem("super-near-login-message")!);

    confirmOwnershipWithServer(
      {
        message: message.message,
        nonce: message.nonce,
        recipient: message.recipient,
        callbackUrl: message.callbackUrl,
      },
      signature,
      publicKey,
      accId,
    );

    const url = new URL(location.href);
    url.hash = "";
    url.search = "";
    window.history.replaceState({}, document.title, url);
    localStorage.removeItem("super-near-login-message");
  }, []);

  const signout = useCallback(
    async () =>
      axios.post(
        process.env.NEXT_PUBLIC_SUPER_API + "/auth/signout",
        {},
        {
          withCredentials: true,
        },
      ),
    [],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!accountId) {
        setVerified(null);
        return;
      }
      if (isSignedInWithServer(accountId)) {
        setVerified(true);
        return;
      }
      setVerified(null);
      verifyOwnershipIfNeeded();
      handleVerifyOwnershipBrowserWalletResponse();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [accountId]);

  const authContextValue: AuthContextValue = {
    signout,
    verified,
    loading: verified == null,
    verifyOwnership: verifyOwnershipIfNeeded,
    syncUserPlan,
    pro,
    userPlan,
  };
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within a AuthContextProvider");
  }

  return context;
}

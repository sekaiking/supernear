import { get_transaction_status } from "@/utils/get_transaction";
import {
  Action,
  FinalExecutionOutcome,
  Wallet,
} from "@near-wallet-selector/core";
import { useEffect } from "react";

interface SignMessageMethod {
  signAndSendTransaction: (
    params: TransactionParams,
  ) => Promise<FinalExecutionOutcome | void>;
}

interface TransactionParams {
  signerId: string;
  receiverId: string;
  actions: Action[];
  callbackUrl?: string;
}

interface BrowserTransactionOutcome {
  transactionHashes?: string;
  errorCode?: string;
  errorMessage?: string;
}

export function createTransactionManager(
  uniqueId: string,
  signerId?: string | null,
) {
  // hook for handling callbacks
  function useTransactionOutcome(
    onSuccess?: (outcome: FinalExecutionOutcome | void) => void,
    onError?: (error: Error) => void,
  ) {
    useEffect(() => {
      if (!signerId) return;
      const params = new URLSearchParams(window.location.search);
      const hasCallback =
        params.has("txManagerKey") &&
        (params.has("transactionHashes") || params.has("errorCode"));

      if (!hasCallback) return;

      const txManagerKey = params.get("txManagerKey") || undefined;

      // Only process if this component initiated the transaction
      if (!txManagerKey || txManagerKey !== uniqueId) return;

      // Get transaction result
      const browserResponse: BrowserTransactionOutcome = {
        transactionHashes: params.get("transactionHashes") || undefined,
        errorCode: params.get("errorCode") || undefined,
        errorMessage: decodeURIComponent(params.get("errorMessage") || ""),
      };

      if (browserResponse.errorCode) {
        onError?.(
          new Error(
            `${browserResponse.errorCode}: ${browserResponse.errorMessage}`,
          ),
        );
      } else if (
        browserResponse.transactionHashes &&
        browserResponse.transactionHashes[0]
      ) {
        const txId = Array.isArray(browserResponse.transactionHashes)
          ? browserResponse.transactionHashes[0]
          : browserResponse.transactionHashes;
        get_transaction_status(txId, signerId!)
          .then((outcome) => {
            onSuccess?.(outcome);
          })
          .catch((e) => {
            onError?.(e);
          });
      }

      // Clean URL
      const url = new URL(window.location.href);
      [
        "transactionHashes",
        "errorCode",
        "errorMessage",
        "txManagerKey",
      ].forEach((param) => {
        url.searchParams.delete(param);
      });
      window.history.replaceState({}, "", url.toString());
    }, [onSuccess, onError, signerId]);
  }

  // Function to initiate transaction
  const signAndSendTransaction = async (
    wallet: Wallet & SignMessageMethod,
    params: Omit<TransactionParams, "callbackUrl">,
    options: { skipCallbackUrl?: boolean } = {},
  ): Promise<FinalExecutionOutcome | void> => {
    const txParams: TransactionParams = { ...params };

    // Only add callback URL if not explicitly skipped
    if (!options.skipCallbackUrl) {
      // Create callback URL
      const url = new URL(window.location.href);
      url.searchParams.set("txManagerKey", uniqueId);
      txParams.callbackUrl = url.toString();
    }

    // Send transaction
    const outcome = await wallet.signAndSendTransaction(txParams);

    return outcome;
  };

  return { useTransactionOutcome, signAndSendTransaction };
}

// Example usage
// export function TransactionComponent() {
//   const { useTransactionOutcome, signAndSendTransaction } =
//     createTransactionManager("TransactionComponent");
//
//   useTransactionOutcome(
//     (outcome) => {
//       console.log("Transaction successful:", outcome);
//     },
//     (error) => {
//       console.error("Transaction failed:", error);
//     },
//   );
//
//   const handleTransaction = async () => {
//     try {
//       const outcome = await signAndSendTransaction(wallet, {
//         signerId: "user.near",
//         receiverId: "contract.near",
//         actions: [
//           /* your actions */
//         ],
//       });
//
//       if (outcome) {
//         // Handle direct outcome
//         console.log("Direct outcome:", outcome);
//       }
//       // If no outcome, we'll get the result via URL callback
//     } catch (error) {
//       console.error("Transaction error:", error);
//     }
//   };
//
//   return <button onClick={handleTransaction}>Send Transaction</button>;
// }

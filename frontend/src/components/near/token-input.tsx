"use client";
import { useEffect, useState } from "react";
import { TokenModal } from "./token-modal";
import styles from "./token-input.module.scss";
import { TokenType, TokenTypeMin } from "@/types";

export default function TokenInput({
  findToken,
  token,
  setToken,
}: {
  findToken?: string | null;
  token?: TokenType | null;
  setToken?: (t: TokenType | null) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [tokens, setTokens] = useState<TokenTypeMin[]>([]);

  useEffect(() => {
    import("@/../public/tokens.min.json").then((r) =>
      setTokens(r.default as any),
    );
  }, []);

  useEffect(() => {
    if (tokens.length && !token) {
      const searchToken = findToken?.toLowerCase();
      if (!searchToken) {
        setToken && setToken(null);
        return;
      }

      const found = tokens.find(
        (v) => v[0] == searchToken || v[1].toLowerCase() == searchToken,
      );

      if (found) {
        setToken &&
          setToken({
            address: found[0],
            symbol: found[1],
            decimals: found[2],
          });
      } else if (
        searchToken?.endsWith(".near") ||
        searchToken?.endsWith(".testnet")
      ) {
        setToken &&
          setToken({
            address: searchToken,
            symbol: searchToken,
          });
      } else {
        setToken && setToken(null);
      }
    }
  }, [findToken, tokens]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={styles.button}
      >
        {token ? (
          <>
            {/* <img */}
            {/*   height={25} */}
            {/*   width={25} */}
            {/*   alt={token.symbol + " icon"} */}
            {/*   className={styles.tokenIcon} */}
            {/*   src={"/api/near/token-icon?contract=" + token.address} */}
            {/* /> */}
            <h3>{token.symbol || token.address}</h3>
          </>
        ) : (
          <span>Select Token </span>
        )}
      </button>
      {showModal && (
        <TokenModal
          tokens={tokens}
          onClose={() => setShowModal(false)}
          onSelect={(t) => {
            setToken && setToken(t);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

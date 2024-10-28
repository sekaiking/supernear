import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";

import styles from "./token-modal.module.scss";
import { TokenType, TokenTypeMin } from "@/types";

export interface TokenSelectorProps {
  tokens?: TokenTypeMin[];
  onSelect?: (token: TokenType) => void;
  onClose?: () => void;
}

function debounce(cb: (...args: any) => void, delay: number) {
  let timeoutId: any;
  return function (...args: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      cb(...args);
    }, delay);
  };
}

export function TokenModal({
  tokens,
  onSelect = () => {},
  onClose = () => {},
}: TokenSelectorProps) {
  const [input, setInput] = useState("");
  const [filteredTokens, setFilteredTokens] = useState<
    TokenTypeMin[] | undefined
  >(undefined);

  const handleInput = (e: any) => {
    setInput(e?.target?.value);
  };

  // filter tokens
  useEffect(() => {
    if (!tokens || input === "") return setFilteredTokens(undefined);
    debounce(() => {
      const searchResults = tokens?.filter((token) => {
        if (
          token[1] &&
          token[1].toLowerCase().includes(input.trim().toLowerCase())
        )
          return true;
        if (
          token[0] &&
          token[0].toLowerCase().includes(input.trim().toLowerCase())
        )
          return true;
        return false;
      });

      if (searchResults.length < 1) {
        setFilteredTokens([[input, "", 0, "", "", 0]]);
      } else {
        setFilteredTokens(searchResults);
      }
    }, 500)();
  }, [input, tokens]);

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        e.target === e.currentTarget && onClose();
      }}
      aria-labelledby="token-selector"
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Select Token</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <X className={styles.closeIcon} />
          </button>
        </div>
        <input
          type="text"
          placeholder="Search symbol or input a Fungible Token address"
          value={input}
          onChange={handleInput}
          className={`Input Input--outline ${styles.searchInput}`}
        />
        <div className={styles.tokenList}>
          {(filteredTokens ? filteredTokens : tokens)
            ?.slice(0, 50)
            .map((t, i) => {
              return (
                <button
                  key={t[1] + i}
                  className={styles.tokenRow}
                  onClick={() =>
                    onSelect({
                      address: t[0],
                      symbol: t[1],
                      decimals: t[2],
                    })
                  }
                >
                  {/* <Image */}
                  {/*   alt={t[1] + " icon"} */}
                  {/*   className={styles.tokenIcon} */}
                  {/*   src={"/api/near/token-icon?contract=" + t[0]} */}
                  {/*   height={25} */}
                  {/*   width={25} */}
                  {/* /> */}
                  <h3 className={styles.tokenSymbol}>{t[1]}</h3>
                  <span className={styles.tokenAddress}>{t[0]}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

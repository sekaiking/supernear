"use client";
import { useState } from "react";
import styles from "./navbar.module.scss";
import Icon from "../common/icon";
import { Button, Confirm, Modal } from "@chatui/core";
import Link from "next/link";
import Logo from "../common/logo";
import { useAuth } from "@/hooks/useAuth";
import { useWalletSelector } from "@/hooks/useWalletSelector";
import toast from "react-hot-toast";

export default function Navbar() {
  const { selector, modal, accountId } = useWalletSelector();
  const { verified, loading, signout, verifyOwnership, pro } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [openConfirmLogout, setOpenConfirmLogout] = useState(false);
  const [openPreAlphWarning, setOpenPreAlphWarning] = useState(false);

  const truncateAddress = (address: string) => {
    if (!address) return "";
    if (address.length > 50) {
      return `${address.slice(0, 10)}...${address.slice(-10)}`;
    }
    return address;
  };

  const onConnect = () => {
    modal.show();
  };
  const onSignOut = async () => {
    setOpenConfirmLogout(false);
    const wallet = await selector.wallet();

    try {
      await wallet.signOut();
      await signout();
    } catch (e: any) {
      toast.error("Failed to sign out " + (e.message || ""));
      return false;
    }
    return true;
  };

  const loggedActions = [
    {
      label: "Logout",
      color: verified !== false ? "primary" : undefined,
      onClick: () => {
        onSignOut();
      },
    },
    {
      label: "Change Wallet",
      onClick: async () => {
        setOpenConfirmLogout(false);
        const good = await onSignOut();
        if (good) {
          modal.show();
        }
      },
    },
    { label: "Back", onClick: () => setOpenConfirmLogout(false) },
  ];

  if (verified == false) {
    loggedActions.unshift({
      label: "Continue Sign In",
      color: "primary",
      onClick: () => {
        setOpenConfirmLogout(false);
        verifyOwnership();
      },
    });
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Left section - Logo */}
          <div className={styles.logoWrapper}>
            <Link href="/" className={styles.logo}>
              <Logo size={24} />
              <span>SuperNear</span>
            </Link>
            <button
              className={styles.label}
              onClick={() => setOpenPreAlphWarning(true)}
            >
              <Icon
                name="warning-circle-fill"
                color="var(--red)"
                opacity={0.8}
                fontSize={16}
              />
              DISCLAIMER
            </button>
          </div>

          {/* Desktop menu */}
          <div className={styles.desktopMenu}>
            <Link href="/chat" className={styles.menuItem}>
              <Icon name="message" fontSize={20} />
              Chat
            </Link>
            <Link href="/sparks" className={styles.menuItem}>
              <Icon name="sparkles" fontSize={20} color="var(--gold)" />
              Sparks
            </Link>
            <Link
              href="/plans"
              className={styles.menuItem}
              style={{
                color: "var(--brand-1)",
              }}
            >
              <Icon name="premium" fontSize={20} color="var(--brand-1)" />
              Pro
            </Link>
            {!!accountId ? (
              <Button
                onClick={() => setOpenConfirmLogout(true)}
                className={verified && pro ? styles.proButton : ""}
              >
                {loading ? (
                  <Icon className="is-spin mr-2" name="spinner" />
                ) : verified == false ? (
                  <Icon className="mr-2" name="close" color="var(--red)" />
                ) : verified == true ? (
                  pro == true ? (
                    <Icon
                      className="mr-2"
                      name="premium"
                      color="var(--brand-1)"
                    />
                  ) : (
                    <Icon className="mr-2" name="check" color="var(--green)" />
                  )
                ) : null}
                {truncateAddress(accountId)}
              </Button>
            ) : (
              <Button onClick={onConnect} color="primary">
                Connect Wallet
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className={styles.mobileMenuButton}>
            <button onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              <Icon name={isOpen ? "close" : "ellipsis-h"} fontSize={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.isOpen : ""}`}>
        <div className={styles.mobileMenuContent}>
          <Link href="/chat" className={styles.mobileMenuItem}>
            <Icon name="message" fontSize={20} />
            Chat
          </Link>
          <Link href="/sparks" className={styles.mobileMenuItem}>
            <Icon name="sparkles" fontSize={20} color="#ffb300" />
            Sparks
          </Link>
          <Link href="/plans" className={styles.menuItem}>
            <Icon name="premium" fontSize={20} color="var(--brand-1)" />
            Pro
          </Link>
          <div className={styles.mobileMenuButton}>
            {!!accountId ? (
              <Button
                className={verified && pro ? styles.proButton : ""}
                onClick={() => setOpenConfirmLogout(true)}
              >
                {loading ? (
                  <Icon className="is-spin mr-2" name="spinner" />
                ) : verified == false ? (
                  <Icon className="mr-2" name="close" color="var(--red)" />
                ) : verified == true ? (
                  pro == true ? (
                    <Icon
                      className="mr-2"
                      name="premium"
                      color="var(--green)"
                    />
                  ) : (
                    <Icon
                      className="mr-2"
                      name="check"
                      color="var(--brand-1)"
                    />
                  )
                ) : null}
                {truncateAddress(accountId)}
              </Button>
            ) : (
              <Button onClick={onConnect} color="primary">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        active={openConfirmLogout}
        title={
          verified == false
            ? "What do you want to  do?"
            : "Do you really want to log out?"
        }
        onClose={() => {
          setOpenConfirmLogout(false);
        }}
        actions={loggedActions as any}
      ></Modal>
      <Confirm
        active={openPreAlphWarning}
        title="Early Access Warning"
        onClose={() => {
          setOpenPreAlphWarning(false);
        }}
        actions={[
          {
            label: "Close",
            color: "primary",
            onClick: () => {
              setOpenPreAlphWarning(false);
            },
          },
        ]}
      >
        <div style={{ textAlign: "left" }}>
          <p className="mb-2">Welcome to SuperNear!</p>
          <p className="mb-2">
            This project is currently in <b>Active Development</b>. Some
            features are up and running, but you may encounter bugs, incomplete
            functionality, or changes as we continue refining SuperNear. By
            using this version, you’re contributing directly to its evolution
            and helping us shape it for the future. For feedback or to follow
            our progress, visit{" "}
            <a href="https://github.com/sekaiking/supernear" target="_blank">
              our GitHub
            </a>
            .
          </p>
          <p>
            Proceed with caution, and thank you for your support and feedback!
          </p>
        </div>
      </Confirm>
    </nav>
  );
}

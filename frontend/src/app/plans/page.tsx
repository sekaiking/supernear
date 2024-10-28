"use client";
import styles from "./page.module.scss";
import { Button, Tab, Tabs } from "@chatui/core";
import Icon from "@/components/common/icon";
import { near_view } from "@/utils/near_view";
import { useCallback, useEffect, useMemo, useState } from "react";
import Big from "big.js";
import { useWalletSelector } from "@/hooks/useWalletSelector";
import { FunctionCallAction } from "@near-wallet-selector/core";
import toast from "react-hot-toast";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function getPlan(): Promise<{
  price: string;
  price_wholesale: string;
  title: string;
  description: string;
  image_url: string;
}> {
  return near_view(
    process.env.NEXT_PUBLIC_PREMIUM_CONTRACT!,
    "get_subscription",
    {
      name: "premium",
    },
  );
}

function hoursToHuman(hours: number) {
  let value = hours;

  const units = {
    year: 12 * 30 * 24,
    month: 30 * 24,
    day: 24,
    hour: 1,
  };

  const result = [];

  for (const name in units) {
    const p = Math.floor(value / units[name as keyof typeof units]);
    if (p == 1) result.push(" " + p + " " + name);
    if (p >= 2) result.push(" " + p + " " + name + "s");
    value %= units[name as keyof typeof units];
  }

  return result.slice(0, 2).join(", ");
}

export default function Plans({}) {
  const [plan, setPlan] = useState({
    title: "Premium",
    description: "",
    image_url: "",
    price: "60000000000000000000000000",
    price_wholesale: "48000000000000000000000000",
  });
  const [customAmount, setCustom] = useState("1");
  const { selector, accountId, modal } = useWalletSelector();
  const searchParams = useSearchParams();
  const { userPlan, syncUserPlan } = useAuth();

  const handleSuccess = useCallback(() => {
    axios.post(
      process.env.NEXT_PUBLIC_SUPER_API + "/plans/clearCache",
      {},
      {
        withCredentials: true,
      },
    );
    syncUserPlan();
    toast("Thank you for subscribing! Your account will be updated shortly.");
  }, [syncUserPlan]);

  useEffect(() => {
    const transactionHashes = searchParams.get("transactionHashes");
    if (!transactionHashes) return;

    const url = new URL(location.href);
    url.hash = "";
    url.search = "";
    window.history.replaceState({}, document.title, url);

    handleSuccess();
  }, [handleSuccess, searchParams]);

  useEffect(() => {
    getPlan().then((v) => v && setPlan(v));
  }, []);

  const handleSubscribe = useCallback(
    async (yoctoNearAmount?: string, nearAmount?: number) => {
      if (!accountId) {
        modal.show();
        toast("Connect your wallet to Subscribe");
        return;
      }

      if (!yoctoNearAmount) {
        if (!nearAmount) {
          return;
        }
        yoctoNearAmount = Big(nearAmount)
          .mul(Big(10).pow(24))
          .toFixed(0)
          .toString();
      }

      const wallet = await selector.wallet();
      const action: FunctionCallAction = {
        type: "FunctionCall",
        params: {
          methodName: "purchase",
          args: {
            name: "premium",
          },
          deposit: yoctoNearAmount,
          gas: "100000000000000",
        },
      };

      await wallet
        ?.signAndSendTransaction({
          signerId: accountId,
          receiverId: process.env.NEXT_PUBLIC_PREMIUM_CONTRACT,
          actions: [action],
          callbackUrl: location.href,
        })
        .then((v) => {
          console.log(v);
          handleSuccess();
        })
        .catch((e) =>
          toast.error(
            e.message ||
              "Something went wrong, couldn't sign and send transaction.",
          ),
        );
    },
    [accountId, selector, modal, handleSuccess],
  );

  const price_human = useMemo(() => {
    return Big(plan.price).div(Big(10).pow(24)).toNumber();
  }, [plan.price]);

  const price_wholesale_human = useMemo(() => {
    return Big(plan.price_wholesale).div(Big(10).pow(24)).toNumber();
  }, [plan.price_wholesale]);

  const price_discount = useMemo(() => {
    return Math.round(100 - (price_wholesale_human * 100) / price_human);
  }, [price_wholesale_human, price_human]);

  const price_monthly_human = useMemo(() => {
    return price_human / 12;
  }, [price_human]);

  const custom_time = useMemo(() => {
    const custom: number = Number(customAmount) || 1;
    if (custom > price_wholesale_human) {
      return hoursToHuman(
        Math.floor((custom * (12 * 30 * 24)) / price_wholesale_human),
      );
    }
    return hoursToHuman(Math.floor((custom * (12 * 30 * 24)) / price_human));
  }, [customAmount, price_human, price_wholesale_human]);

  return (
    <>
      {userPlan && userPlan.subscription_ends > new Date() && (
        <div className={styles.gridSuccess}>
          <Icon name="premium" fontSize={48} color="var(--brand-1)" />
          <h1>Thank you for subscribing!</h1>
          <p>
            You are subscribed to pro plan until{" "}
            {userPlan.subscription_ends.toLocaleString()}
          </p>
        </div>
      )}
      {userPlan && userPlan.subscription_ends <= new Date() && (
        <div className={styles.gridSuccess}>
          <Icon name="close" fontSize={48} color="var(--red)" />
          <h1>Your subscription have ended</h1>
          <p>
            Your subscription ended at{" "}
            {userPlan.subscription_ends.toLocaleString()}.
          </p>
        </div>
      )}
      <div className={styles.grid}>
        <h1>
          <Icon name="premium" color="var(--brand-1)" fontSize={30} />
          Upgrade to Pro for more messages!
        </h1>
        <Tabs index={0} onChange={() => {}}>
          <Tab label={`Yearly (${price_discount}% discount)`}>
            <div className={styles.tabContent}>
              <p className={styles.price}>
                <Icon name="near" fontSize={20} />
                <s>{price_human} NEAR</s>
                <b>{price_wholesale_human} NEAR</b> for 1 year
              </p>
              <Button
                color="primary"
                size="lg"
                onClick={() => handleSubscribe(plan.price_wholesale)}
              >
                Subscribe to Pro
              </Button>
            </div>
          </Tab>
          <Tab label="Monthly">
            <div className={styles.tabContent}>
              <p className={styles.price}>
                <Icon name="near" fontSize={20} />
                <b>{price_monthly_human} NEAR</b> for 1 month
              </p>
              <Button
                color="primary"
                size="lg"
                onClick={() =>
                  handleSubscribe(Big(plan.price).div(12).toFixed(0).toString())
                }
              >
                Subscribe to Pro
              </Button>
            </div>
          </Tab>
          <Tab label="Custom">
            <div className={styles.tabContent}>
              <p className={styles.price}>
                <Icon name="near" fontSize={20} />
                <b>{customAmount} NEAR</b> for <b>~{custom_time}</b>
              </p>
              <input
                type="range"
                min="1"
                max="100"
                step={1}
                value={customAmount}
                onChange={(e) => {
                  setCustom(e.target.value);
                }}
              />
              <Button
                color="primary"
                size="lg"
                onClick={() =>
                  handleSubscribe(undefined, Number(customAmount) || 1)
                }
              >
                Subscribe to Pro
              </Button>
            </div>
          </Tab>
        </Tabs>

        <div className={styles.benefits}>
          <h2>What you&apos;ll get</h2>
          <ul>
            <li>Send up to 1000 messages per day (instead of 20)</li>
            <li>Create and use Sparks to suit your needs</li>
            <li>Priority support via GitHub</li>
            <li>Contribute to sustaining and growing the project</li>
            <li>Enhanced referral rewards (coming soon!)</li>
            <li>Access to advanced models and more features (coming soon!)</li>
          </ul>

          <h2>Why Can&apos;t SuperNear Be Completely Free?</h2>
          <p>
            While we’d love to make SuperNear freely accessible to everyone,
            running Large Language Models (LLMs) is costly. These models require
            powerful GPUs or paid API providers to function effectively.
            <br />
            <br />
            By supporting SuperNear, you’re not just gaining added features —
            you’re helping bring this project to life and keep it sustainable.
          </p>
        </div>
      </div>
    </>
  );
}

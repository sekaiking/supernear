"use client";
import SparkCard from "@/components/sparks/card";
import styles from "./page.module.scss";
import { Button } from "@chatui/core";
import daos from "@/assets/images/daos.svg";
import potlock from "@/assets/images/potlock.png";

const sparks = [
  {
    title: "Call Smart Contract",
    description: "",
    installed: true,
  },
  {
    title: "NEAR/FT Send",
    description: "",
    installed: true,
  },
  {
    title: "Explorer",
    description: "",
    installed: true,
  },
  {
    title: "NFT Send",
    description: "",
    installed: true,
  },
  {
    title: "NFT Mint",
    description: "",
    installed: true,
  },
  {
    title: "FT Creation",
    description: "",
    installed: true,
  },
  {
    title: "Market Data",
    description: "",
    installed: false,
  },
  {
    title: "Swap Tokens",
    description: "",
    installed: false,
  },
  {
    title: "Staking/Unstacking",
    description: "",
    installed: false,
  },
  {
    title: "Smart Contract Deployment",
    description: "",
    installed: false,
  },
  {
    title: "Dapps Ecosystem",
    description: "",
    installed: false,
  },
  {
    title: "Social Data",
    description: "",
    installed: false,
  },
  {
    title: "BOS Components",
    description: "",
    installed: false,
  },
  {
    title: "DAOs",
    description: "",
    installed: false,
  },
  {
    title: "POTLOCK",
    description: "",
    installed: false,
  },
];

export default function Sparks({}) {
  return (
    <div className={["container", styles.container].join(" ")}>
      <div className={styles.header}>
        <h2>All sparks</h2>
        <Button disabled={true} label="Create a Spark" color="primary" />
      </div>
      <div className={styles.grid}>
        {sparks.map((s, i) => (
          <SparkCard
            key={i}
            // logo={s?.logo}
            title={s.title}
            description={s.description}
            isInstalled={s.installed}
            disabled={true}
          />
        ))}
      </div>
    </div>
  );
}

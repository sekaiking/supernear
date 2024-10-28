"use client";
import React from "react";
import styles from "./card.module.scss";
import { Button } from "@chatui/core";

type SparkCardProps = {
  logo?: string;
  title: string;
  description: string;
  onDetails?: () => {};
  onInstall?: () => {};
  isInstalled?: boolean;
  disabled?: boolean;
};

const SparkCard: React.FC<SparkCardProps> = ({
  logo,
  title,
  description,
  onDetails,
  onInstall,
  isInstalled,
  disabled,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.logoContainer}>
        {logo && <img src={logo} alt="Logo" className={styles.logoImage} />}
      </div>
      <div className={styles.content}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={styles.actions}>
        <Button label="Details" variant="outline" onClick={onDetails} />
        <Button
          label={isInstalled ? "Installed" : "Install"}
          icon={isInstalled ? "check" : "plus"}
          color={isInstalled ? undefined : "primary"}
          onClick={onInstall}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default SparkCard;

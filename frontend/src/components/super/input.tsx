import React from "react";
import styles from "./input.module.scss";
import Icon from "../common/icon";

interface SuperInputProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  animated?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SuperInput: React.FC<SuperInputProps> = ({
  placeholder = "Enter text here...",
  animated = false,
  disabled = false,
  value,
  defaultValue,
  onChange,
}) => {
  return (
    <div
      className={[styles.root, animated ? styles.animated : undefined].join(
        " ",
      )}
    >
      <div className={styles.glow}></div>
      <div className={styles.border}></div>
      <div className={styles.white}></div>
      <div className={styles.inputContainer}>
        <input
          type="text"
          placeholder={placeholder}
          className={styles.input}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          name="super-input"
        />
        <button
          disabled={disabled}
          type="submit"
          className={styles.inputButton}
        >
          <Icon name="chevron-right" />
        </button>
      </div>
    </div>
  );
};

export default SuperInput;

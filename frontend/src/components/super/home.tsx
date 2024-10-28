"use client";
import SuperBG from "./bg";
import SuperQuicky from "./quicky";
import styles from "./home.module.scss";
import SuperInput from "./input";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SuperHome() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.target as any);
    const input = data.get("super-input") as string;
    if (input?.length) {
      router.push("/chat?query=" + input);
      return;
    } else {
      toast("Write a message first");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`container ${styles.container}`}>
      <SuperBG />
      <h1>Super near</h1>
      <SuperInput placeholder="What can I do for you?" animated={true} />
      <SuperQuicky
        items={[
          {
            title: "I'd like to transfer some NEAR",
          },
          {
            title: "Give me a breakdown of my wallet",
          },
          {
            title: "All my transactions between 1 oct and 10 oct",
          },
          {
            title: "What can SuperNear do?",
          },
          {
            title: "What's the current price of Near?",
          },
          {
            title: "What are the trending Dapps?",
          },
        ]}
        onQuicky={(item: any) => {
          router.push("/chat?query=" + item.title);
        }}
      />
    </form>
  );
}

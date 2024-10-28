import styles from "./quicky.module.scss";

interface ItemType {
  title: string;
  [key: string]: string;
}

export default function SuperQuicky({
  items,
  onQuicky,
}: {
  items?: ItemType[];
  onQuicky: (item: ItemType) => void;
}) {
  return (
    <div className={styles.container}>
      <ul>
        {items?.map((item, i) => {
          return (
            <Item key={i} onClick={() => onQuicky(item)} title={item.title} />
          );
        })}
      </ul>
    </div>
  );
}

const Item = ({
  title,
  onClick,
}: {
  title: string;
  onClick: (p: string) => void;
}) => {
  return (
    <li>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onClick(title);
        }}
      >
        {title}
      </button>
    </li>
  );
};

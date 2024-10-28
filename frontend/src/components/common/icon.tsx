export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
}

export default function Icon({ name, className, ...others }: IconProps) {
  return (
    <svg className={`Icon ${className}`} aria-hidden="true" {...others}>
      <use xlinkHref={`#icon-${name}`}></use>
    </svg>
  );
}

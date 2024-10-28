import { type FC } from "react";

interface LogoProps {
  size?: number;
  startColor?: string;
  endColor?: string;
  className?: string;
}

const Logo: FC<LogoProps> = ({
  size = 100,
  startColor = "var(--brand-2)",
  endColor = "var(--brand-1)",
  className = "",
}) => {
  const aspectRatio = 0.883;
  const height = size * aspectRatio;

  return (
    <svg
      viewBox="0 0 367.88 324.98"
      width={size}
      height={height}
      className={className}
    >
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0"
          y1="162.49"
          x2="367.88"
          y2="162.49"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor={startColor} />
          <stop offset="1" stopColor={endColor} />
        </linearGradient>
      </defs>
      <path
        fill="url(#logo-gradient)"
        d="M367.88,210.94v8.17h-.03c0,58.47-47.4,105.87-105.87,105.87H14.51v-101.27h152.19c1.18,0,2.36.21,3.47.62l39.78,14.72c2.77,1.02,4.95,3.21,5.97,5.97l16.72,45.19c1.63,4.41,7.87,4.41,9.5,0l16.73-45.19c1.02-2.77,3.21-4.95,5.97-5.97l45.19-16.72c4.41-1.63,4.41-7.87,0-9.5l-45.19-16.73c-2.77-1.02-4.95-3.21-5.97-5.97l-16.73-45.19c-1.63-4.41-7.87-4.41-9.5,0l-16.72,45.19c-1.02,2.77-3.21,4.95-5.97,5.97l-39.78,14.72c-1.11.41-2.29.62-3.47.62h-67.43c-53.33,0-97.82-42.12-99.19-95.44-.02-.92-.04-1.84-.04-2.77v-7.36h-.05C0,47.4,47.4,0,105.87,0h247.47v104.9h-144.45c-1.18,0-2.36-.21-3.47-.62l-38.07-14.09c-2.81-1.04-5.02-3.25-6.06-6.06l-16.7-45.13c-1.63-4.41-7.86-4.41-9.5,0l-16.69,45.13c-1.04,2.81-3.25,5.02-6.06,6.06l-45.13,16.7c-4.41,1.63-4.41,7.86,0,9.5l45.13,16.69c2.81,1.04,5.02,3.25,6.06,6.06l16.69,45.13c1.64,4.41,7.87,4.41,9.5,0l16.75-45.27c1.01-2.73,3.13-4.9,5.83-5.97l38.22-15.18c1.17-.47,2.43-.71,3.69-.71h64.23c50.94,0,93.33,40.32,94.53,91.25.02.84.03,1.69.03,2.54Z"
      />
    </svg>
  );
};

export default Logo;

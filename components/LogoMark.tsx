type LogoMarkProps = {
  className?: string;
  size?: number;
};

export function LogoMark({ className = "", size = 28 }: LogoMarkProps) {
  return (
    <img
      src="/show-next-icon.png"
      alt=""
      className={["logo-mark", className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      draggable={false}
    />
  );
}

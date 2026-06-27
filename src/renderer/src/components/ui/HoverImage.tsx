import type { ImgHTMLAttributes } from "react";

export function HoverImage({
  className = "",
  alt = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      alt={alt}
      className={`size-full object-cover transition-transform duration-300 group-hover:scale-105 ${className}`}
      {...props}
    />
  );
}

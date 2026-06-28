import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

export function HoverImage({
  className = "",
  alt = "",
  src,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <span ref={ref} className="block size-full bg-surface-hover">
      {visible && src ? (
        <img
          alt={alt}
          src={src}
          onLoad={() => setLoaded(true)}
          decoding="async"
          className={`size-full object-cover transition-[transform,opacity] duration-300 group-hover:scale-105 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          {...props}
        />
      ) : null}
    </span>
  );
}

import { cn } from '@/lib/utils';
import { useCachedImage } from '@/hooks/useCachedImage';
import type { ImgHTMLAttributes } from 'react';

type CachedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string | null | undefined;
};

export function CachedImage({ src, className, ...rest }: CachedImageProps) {
  const cachedSrc = useCachedImage(src);

  if (!src && !cachedSrc) {
    return null;
  }

  return (
    <img
      {...rest}
      src={cachedSrc ?? src ?? undefined}
      className={className ? cn(className) : undefined}
    />
  );
}


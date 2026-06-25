import type { Photo } from "../../../../shared/types/gallery";

export interface JustifiedTile {
  photo: Photo;
  width: number;
  height: number;
}
export type JustifiedRow = JustifiedTile[];

export function justify(
  photos: Photo[],
  containerWidth: number,
  targetHeight: number,
  gap: number,
): JustifiedRow[] {
  if (containerWidth <= 0) return [];
  const rows: JustifiedRow[] = [];
  let row: { photo: Photo; ratio: number }[] = [];
  let ratioSum = 0;

  const flush = (last: boolean) => {
    if (row.length === 0) return;
    const gaps = gap * (row.length - 1);
    let h = (containerWidth - gaps) / ratioSum;
    if (last && h > targetHeight * 1.5) h = targetHeight;
    rows.push(row.map(({ photo, ratio }) => ({ photo, width: ratio * h, height: h })));
    row = [];
    ratioSum = 0;
  };

  for (const photo of photos) {
    const ratio = aspect(photo);
    row.push({ photo, ratio });
    ratioSum += ratio;
    const gaps = gap * (row.length - 1);
    const projected = (containerWidth - gaps) / ratioSum;
    if (projected <= targetHeight) flush(false);
  }
  flush(true);
  return rows;
}

function aspect(photo: Photo): number {
  const { width, height } = photo.metadata;
  if (width && height) return width / height;
  return 16 / 9;
}

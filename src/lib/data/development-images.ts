type ImageRecord = {
  id: string;
  imageUrl?: string | null;
};

type ImageFallback = (record: ImageRecord) => string;

const MACHINE_IMAGE_POOL = [
  "/images/machines/furnace.webp",
  "/images/machines/assembly-machine.webp",
  "/images/machines/saw-machine.webp",
  "/images/machines/die-casting-machine.webp",
  "/images/machines/small-storage.webp",
  "/images/machines/large-storage.webp",
  "/images/machines/medium-storage.webp",
  "/images/machines/tumbler-machine.webp",
  "/images/machines/generator.webp",
];

const machineImageFallback: ImageFallback = () =>
  MACHINE_IMAGE_POOL[Math.floor(Math.random() * MACHINE_IMAGE_POOL.length)];

export const itemImageFallback: ImageFallback = (record) =>
  `https://picsum.photos/seed/item-${encodeURIComponent(record.id)}/110/110`;

export function addDevelopmentImages<T extends ImageRecord>(
  records: T[],
  fallback: ImageFallback = machineImageFallback,
): T[] {
  if (import.meta.env?.DEV !== true) return records;

  return records.map((record) => {
    if (record.imageUrl || Math.random() >= 0.5) return record;
    return { ...record, imageUrl: fallback(record) };
  });
}

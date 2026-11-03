import Dialog from '@/components/shared/ui/Dialog';

/** Foto grande de un mensaje. `image` es `{ url, alt }` o `null` (cerrado). */
export default function ImageDialog({ image, onClose }) {
  return (
    <Dialog open={Boolean(image)} onOpenChange={(open) => !open && onClose()} title="Foto">
      {image && <img src={image.url} alt={image.alt} className="mx-auto max-h-[70vh] max-w-full rounded-lg" />}
    </Dialog>
  );
}

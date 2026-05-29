export default function CompactVideoPreview({ src, label = "Prévia do vídeo", size = "sm" }) {
  if (!src) return null;
  const cls = size === "md" ? "videoThumb videoThumbMd" : "videoThumb videoThumbSm";
  return (
    <video
      src={src}
      preload="metadata"
      playsInline
      muted
      controls
      className={cls}
      aria-label={label}
      title={label}
    />
  );
}

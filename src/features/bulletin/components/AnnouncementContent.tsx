import type { AnnouncementDocument, AnnouncementMedia } from '../model/types';

function BodyText({ body }: { body: string }) {
  const paragraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-[color:var(--nx-text-muted)] leading-7">
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));
        if (isList) {
          return (
            <ul key={index} className="list-disc pl-6 space-y-2">
              {lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^[-*]\s+/, '')}</li>)}
            </ul>
          );
        }
        return <p key={index} className="whitespace-pre-line">{paragraph}</p>;
      })}
    </div>
  );
}

function MediaGallery({ media }: { media: AnnouncementMedia[] }) {
  if (media.length === 0) return null;
  return (
    <div className={`grid gap-4 ${media.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
      {media.map((image) => (
        <figure key={image.id} className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-nx bg-surface-2">
            <img
              src={image.url}
              alt={image.altText}
              width={image.width}
              height={image.height}
              loading="lazy"
              decoding="async"
              className="w-full max-h-[34rem] object-contain"
            />
          </div>
          {image.caption && <figcaption className="text-sm text-dim mt-2 leading-6">{image.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export default function AnnouncementContent({
  document,
  media = [],
}: {
  document: AnnouncementDocument;
  media?: AnnouncementMedia[];
}) {
  const sectionIds = new Set(document.sections.map((section) => section.id));
  const orderedMedia = [...media].sort((left, right) => left.sortOrder - right.sortOrder);
  const leadMedia = orderedMedia.filter((image) => !image.sectionId || !sectionIds.has(image.sectionId));

  return (
    <div className="space-y-8">
      <MediaGallery media={leadMedia} />
      {document.sections.map((section, index) => (
        <section key={section.id} aria-labelledby={section.heading ? `bulletin-section-${section.id}` : undefined}>
          {section.heading && (
            <h2 id={`bulletin-section-${section.id}`} className="text-xl font-semibold tracking-tight mb-3">
              {section.heading}
            </h2>
          )}
          <BodyText body={section.body} />
          {orderedMedia.some((image) => image.sectionId === section.id) && (
            <div className="mt-5">
              <MediaGallery media={orderedMedia.filter((image) => image.sectionId === section.id)} />
            </div>
          )}
          {index < document.sections.length - 1 && <div className="divider mt-8" />}
        </section>
      ))}
    </div>
  );
}

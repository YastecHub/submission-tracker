import type { AnnouncementDocument } from '../model/types';

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

export default function AnnouncementContent({ document }: { document: AnnouncementDocument }) {
  return (
    <div className="space-y-8">
      {document.sections.map((section, index) => (
        <section key={section.id} aria-labelledby={section.heading ? `bulletin-section-${section.id}` : undefined}>
          {section.heading && (
            <h2 id={`bulletin-section-${section.id}`} className="text-xl font-semibold tracking-tight mb-3">
              {section.heading}
            </h2>
          )}
          <BodyText body={section.body} />
          {index < document.sections.length - 1 && <div className="divider mt-8" />}
        </section>
      ))}
    </div>
  );
}

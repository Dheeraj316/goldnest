type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  light?: boolean;
};

export function SectionHeading({ eyebrow, title, description, align = 'left', light = false }: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <span className={`eyebrow ${light ? 'text-gold-300' : ''}`}>{eyebrow}</span>
      <h2 className={`mt-3 font-display text-3xl font-semibold sm:text-4xl ${light ? 'text-white' : 'text-ink'}`}>{title}</h2>
      {description && <p className={`mt-4 text-base leading-relaxed ${light ? 'text-white/60' : 'text-ink-light'}`}>{description}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div className="absolute inset-0 bg-gold-radial" aria-hidden="true" />
      <div className="container-page relative py-16 lg:py-20">
        <span className="eyebrow text-gold-300">{eyebrow}</span>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        {description && <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">{description}</p>}
      </div>
    </section>
  );
}

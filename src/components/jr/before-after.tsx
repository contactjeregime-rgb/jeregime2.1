import Image from "next/image";

export default function BeforeAfter() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="max-w-3xl pb-10 md:pb-12">
          <h2 className="h2">Avant / Après</h2>
          <p className="mt-4 text-lg text-slate-600">
            Des transformations réelles (à remplacer par vos résultats clients avec consentement).
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border bg-white">
            <Image
              src="/images/large-testimonial.jpg"
              alt="Avant / Après"
              width={1200}
              height={800}
              className="h-[360px] w-full object-cover"
              priority
            />
          </div>

          <div className="relative overflow-hidden rounded-2xl border bg-white">
            <Image
              src="/images/large-testimonial.jpg"
              alt="Avant / Après"
              width={1200}
              height={800}
              className="h-[360px] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

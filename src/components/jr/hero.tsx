import Image from "next/image";
import PageIllustration from "@/components/page-illustration";
import Avatar01 from "@/public/images/avatar-01.jpg";
import Avatar02 from "@/public/images/avatar-02.jpg";
import Avatar03 from "@/public/images/avatar-03.jpg";
import Avatar04 from "@/public/images/avatar-04.jpg";
import Avatar05 from "@/public/images/avatar-05.jpg";
import Avatar06 from "@/public/images/avatar-06.jpg";

export default function Hero() {
  return (
    <section className="relative">
      <PageIllustration />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pb-12 pt-32 md:pb-20 md:pt-40">
          <div className="pb-12 text-center md:pb-16">
            <div
              className="mb-6 border-y [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1]"
              data-aos="zoom-y-out"
            >
              <div className="-mx-0.5 flex justify-center -space-x-3">
                <Image className="box-content rounded-full border-2 border-gray-50" src={Avatar01} width={32} height={32} alt="Avis" />
                <Image className="box-content rounded-full border-2 border-gray-50" src={Avatar02} width={32} height={32} alt="Avis" />
                <Image className="box-content rounded-full border-2 border-gray-50" src={Avatar03} width={32} height={32} alt="Avis" />
                <Image className="box-content rounded-full border-2 border-gray-50" src={Avatar04} width={32} height={32} alt="Avis" />
                <Image className="box-content rounded-full border-2 border-gray-50" src={Avatar05} width={32} height={32} alt="Avis" />
                <Image className="box-content rounded-full border-2 border-gray-50" src={Avatar06} width={32} height={32} alt="Avis" />
              </div>
            </div>

            <h1
              className="mb-6 border-y text-5xl font-bold [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] md:text-6xl"
              data-aos="zoom-y-out"
              data-aos-delay={150}
            >
              Le régime le plus simple <br className="max-lg:hidden" />
              pour enfin tenir dans la durée
            </h1>

            <div className="mx-auto max-w-3xl">
              <p
                className="mb-8 text-lg text-gray-700"
                data-aos="zoom-y-out"
                data-aos-delay={300}
              >
                JeRegime propose des repas adaptés à votre profil, une liste de courses selon votre budget,
                un immense catalogue de recettes diététiques, et un suivi régulier.
                Après l’onboarding, vous planifiez votre rendez-vous diététicien (visio ou téléphone) sous 48h.
              </p>

              <div className="relative before:absolute before:inset-0 before:border-y before:[border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1]">
                <div
                  className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center"
                  data-aos="zoom-y-out"
                  data-aos-delay={450}
                >
                  <a
                    className="btn group mb-4 w-full bg-linear-to-t from-blue-600 to-blue-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-sm hover:bg-[length:100%_150%] sm:mb-0 sm:w-auto"
                    href="/signup"
                  >
                    <span className="relative inline-flex items-center">
                      Commencer{" "}
                      <span className="ml-1 tracking-normal text-blue-300 transition-transform group-hover:translate-x-0.5">
                        -&gt;
                      </span>
                    </span>
                  </a>

                  <a
                    className="btn w-full bg-white text-gray-800 shadow-sm hover:bg-gray-50 sm:ml-4 sm:w-auto"
                    href="#core"
                  >
                    Voir le cœur de l’app
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Hero image (app preview) */}
          <div className="mx-auto max-w-4xl" data-aos="zoom-y-out" data-aos-delay={600}>
            <div className="relative overflow-hidden rounded-2xl bg-gray-900 shadow-xl before:pointer-events-none before:absolute before:-inset-5 before:border-y before:[border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] after:absolute after:-inset-5 after:-z-10 after:border-x after:[border-image:linear-gradient(to_bottom,transparent,--theme(--color-slate-300/.8),transparent)1]">
              <div className="relative h-[420px]">
                <Image
                  src="/images/large-testimonial.jpg"
                  alt="Aperçu JeRegime"
                  fill
                  className="object-cover opacity-95"
                  sizes="(max-width: 768px) 100vw, 900px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-gray-900/10 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-left">
                  <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs text-white backdrop-blur">
                    Menu du jour • Courses • Recettes • RDV diététicien
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

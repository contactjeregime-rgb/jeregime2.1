import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Image
          src="/jr/hero.jpg"
          alt="Coach diététique personnalisé"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/20 text-sm px-4 py-2">
            Coach diététique + IA — adapté à vous
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight mb-6">
            Votre alimentation,
            <br />
            <span className="text-zinc-300">enfin personnalisée.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Un accompagnement avec un coach diététique 24h/24 – 7j/7 qui respecte vos goûts, 
            votre budget et votre rythme de vie.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 text-base font-semibold shadow-lg px-8 py-6 rounded-full font-medium">
              <Link href="/signup">Commencer maintenant →</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="bg-white/15 text-white font-medium hover:bg-white/25 text-base px-8 py-6 rounded-full font-medium backdrop-blur-sm">
              <a href="#comment-ca-marche">Voir comment ça marche</a>
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Coach inclus",
              "RDV sous 48h",
              "Adapté à votre budget",
              "Respecte vos goûts"
            ].map((item) => (
              <span
                key={item}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/10"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment-ca-marche" className="py-24 sm:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-20">
            <Badge variant="secondary" className="mb-4 text-zinc-600">Simple et efficace</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight">
              Comment ça marche
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: "01",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                title: "Parlez-nous de vous",
                description: "Vos goûts, allergies, budget et objectifs. En 3 minutes, on vous connaît."
              },
              {
                step: "02",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Recevez votre plan",
                description: "Menus personnalisés, liste de courses et conseils pratiques chaque semaine."
              },
              {
                step: "03",
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: "Échangez avec votre coach",
                description: "RDV visio avec un diététicien diplômé. Ajustements, motivation, suivi humain."
              }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="flex flex-col items-center text-center bg-zinc-50 border border-zinc-100 hover:border-zinc-200 hover:shadow-lg transition-all duration-300 p-10 sm:p-12 rounded-[2rem] bg-zinc-50 border border-zinc-100 hover:border-zinc-200 hover:shadow-lg transition-all duration-300">
                  <span className="text-xs font-mono text-zinc-400 mb-4">{item.step}</span>
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-semibold text-zinc-900 mb-3">{item.title}</h3>
                  <p className="text-lg text-zinc-600 leading-relaxed">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-px bg-zinc-200" />
                )}
              </div>
            ))}
          </div>
        </div>

          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className="rounded-full px-10 py-6 text-base font-semibold shadow-lg">
              <Link href="/contact">Prendre rendez-vous</Link>
            </Button>
          </div>
      </section>

      {/* CE QUE VOUS OBTENEZ */}
      <section className="py-24 sm:py-32 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-20">
            <Badge variant="secondary" className="mb-4 text-zinc-600">Tout inclus</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-4">
              Ce que vous obtenez
            </h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Un accompagnement complet pour transformer votre alimentation durablement.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                image: "/jr/meals.jpg",
                title: "Menus sur mesure",
                description: "Des repas que vous aimerez vraiment, adaptés à vos envies et contraintes."
              },
              {
                image: "/jr/groceries.jpg",
                title: "Listes de courses",
                description: "Optimisées pour votre budget et disponibles en un clic."
              },
              {
                image: "/jr/dietitian.jpg",
                title: "Suivi humain",
                description: "Un diététicien diplômé vous accompagne en visio, pas un robot."
              }
            ].map((item, index) => (
              <Card key={index} className="overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 group bg-white">
                <div className="relative h-56 sm:h-64 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-2xl font-semibold text-zinc-900 mb-2">{item.title}</h3>
                  <p className="text-lg text-zinc-600 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AVIS VÉRIFIÉS */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-20">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-2">
              4.9/5 sur Google
            </h2>
            <p className="text-zinc-500">Plus de 2 400 avis vérifiés</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                name: "Marie L.",
                avatar: "/jr/meals.jpg",
                text: "Enfin un programme qui respecte mes goûts ! Je mange bien, je ne me prive pas, et j'ai perdu 8kg en 3 mois.",
                date: "Il y a 2 semaines"
              },
              {
                name: "Thomas B.",
                avatar: "/jr/groceries.jpg",
                text: "Le suivi avec mon coach change tout. Pas juste une app, un vrai accompagnement humain.",
                date: "Il y a 1 mois"
              },
              {
                name: "Sophie M.",
                avatar: "/jr/recipes.jpg",
                text: "Les listes de courses sont géniales. Je gagne du temps et de l'argent. Merci JeRegime !",
                date: "Il y a 3 semaines"
              }
            ].map((review, index) => (
              <Card key={index} className="border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-zinc-700 leading-relaxed mb-6">&ldquo;{review.text}&rdquo;</p>
                  <Separator className="mb-4" />
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                      <Image
                        src={review.avatar}
                        alt={review.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 text-sm">{review.name}</p>
                      <p className="text-xs text-zinc-500">{review.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                      Avis vérifié
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AVANT/APRÈS */}
      <section className="py-24 sm:py-32 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge variant="secondary" className="mb-4 text-zinc-600">Résultats</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-4">
              Ils ont transformé leur quotidien
            </h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Des résultats visibles, obtenus progressivement et durablement.
            </p>
          </div>
          
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/jr/beforeafter.jpg"
              alt="Transformations de nos membres"
              width={1200}
              height={600}
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
              <p className="text-white/80 text-sm sm:text-base max-w-2xl">
                * Exemples de résultats obtenus par nos membres. Les résultats varient selon les individus et dépendent de nombreux facteurs. JeRegime ne fait aucune promesse médicale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 sm:py-32 bg-zinc-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20">
            Commencez aujourd&apos;hui
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Prêt à changer votre alimentation ?
          </h2>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Rejoignez des milliers de personnes qui mangent mieux, 
            sans se priver, avec un vrai coach à leurs côtés.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button asChild size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 text-base font-semibold shadow-lg px-8 py-6 rounded-full font-medium">
              <Link href="/signup">Commencer gratuitement</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="bg-white/15 text-white font-medium hover:bg-white/25 text-base px-8 py-6 rounded-full font-medium">
              <Link href="/contact">Nous contacter</Link>
            </Button>
          </div>
          
          <p className="text-zinc-500 text-sm">
            Essai gratuit de 7 jours · Sans engagement · Annulation en 1 clic
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-zinc-500 text-sm">
              © 2025 JeRegime. Tous droits réservés.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/mentions-legales" className="text-zinc-500 hover:text-white text-sm transition-colors">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="text-zinc-500 hover:text-white text-sm transition-colors">
                Confidentialité
              </Link>
              <Link href="/cgu" className="text-zinc-500 hover:text-white text-sm transition-colors">
                CGV
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

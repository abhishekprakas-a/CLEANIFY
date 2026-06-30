import Link from "next/link";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFaq } from "@/components/landing/faq";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/starRating";
import { getSessionUser } from "@/lib/authGuard";
import { roleHomeRoute } from "@/constants";

export const dynamic = "force-dynamic";

const services = [
  {
    icon: "🏢",
    title: "Overhead tanks",
    desc: "Rooftop and loft tanks scrubbed, disinfected and sediment-free.",
  },
  {
    icon: "🛢️",
    title: "Underground sumps",
    desc: "Deep cleaning of underground sumps with safe confined-space handling.",
  },
  {
    icon: "🏬",
    title: "Commercial complexes",
    desc: "Apartments, offices and hospitals — scheduled, large-capacity cleaning.",
  },
  {
    icon: "🧪",
    title: "Disinfection & testing",
    desc: "Food-grade sanitization and water quality checks after every clean.",
  },
];

const why = [
  {
    icon: "👷",
    title: "Certified technicians",
    desc: "Trained, background-checked, uniformed crews.",
  },
  {
    icon: "📸",
    title: "Before & after photos",
    desc: "Visual proof of every job, approved by you.",
  },
  {
    icon: "⏱️",
    title: "On-time guarantee",
    desc: "Live scheduling and timely arrivals.",
  },
  {
    icon: "🌿",
    title: "Eco-friendly",
    desc: "Food-grade, residue-free disinfectants.",
  },
];

const steps = [
  {
    n: "1",
    title: "Book online",
    desc: "Pick a tank type, date and time in seconds.",
  },
  {
    n: "2",
    title: "We clean & sanitize",
    desc: "Our technician arrives, cleans, and uploads photos.",
  },
  {
    n: "3",
    title: "Approve & relax",
    desc: "Review the before/after photos and enjoy clean water.",
  },
];

const pricing = [
  {
    name: "Residential",
    price: "₹999",
    unit: "/ tank",
    features: [
      "1 overhead or underground tank",
      "Scrub + disinfection",
      "Before & after photos",
      "Water-safe chemicals",
    ],
    popular: false,
  },
  {
    name: "Commercial",
    price: "₹2,499",
    unit: "/ visit",
    features: [
      "Up to 3 tanks",
      "Priority scheduling",
      "Dedicated technician",
      "Quality test report",
    ],
    popular: true,
  },
  {
    name: "Annual Care",
    price: "₹4,999",
    unit: "/ year",
    features: [
      "4 cleanings a year",
      "1 free emergency visit",
      "24/7 support",
      "Reminder scheduling",
    ],
    popular: false,
  },
];

const testimonials = [
  {
    name: "Anita R.",
    initials: "AR",
    color: "bg-rose-500",
    rating: 5,
    text: "Booked in minutes and the before/after photos gave me total peace of mind. Water tastes fresh!",
  },
  {
    name: "Mohan Apartments",
    initials: "MA",
    color: "bg-indigo-500",
    rating: 5,
    text: "They handle all 6 of our building tanks on schedule. Reliable and professional every time.",
  },
  {
    name: "Sara K.",
    initials: "SK",
    color: "bg-emerald-500",
    rating: 4,
    text: "Friendly technician, on time, and the app kept me updated throughout. Highly recommend.",
  },
];

const gallery = [
  "https://picsum.photos/seed/aqua1/600/400",
  "https://picsum.photos/seed/aqua2/600/400",
  "https://picsum.photos/seed/aqua3/600/400",
  "https://picsum.photos/seed/aqua4/600/400",
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const isAuthed = Boolean(user);
  const homeHref = user ? (roleHomeRoute[user.role] ?? "/login") : "/login";

  return (
    <div className="bg-white">
      <LandingNavbar isAuthed={isAuthed} homeHref={homeHref} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cyan-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              💧 Trusted by 1,200+ homes & businesses
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Clean water tanks,{" "}
              <span className="text-brand-600">guaranteed spotless.</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-600">
              Professional water tank cleaning and disinfection — booked online,
              done by certified technicians, with before & after photo proof.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#pricing">
                <Button size="lg">Book a cleaning</Button>
              </a>
              <a href="#services">
                <Button size="lg" variant="secondary">
                  Our services
                </Button>
              </a>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <StarRating value={5} readOnly size="sm" />
              <span className="font-medium text-slate-700">4.8/5</span>
              <span>from 900+ reviews</span>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="relative mx-auto w-full max-w-md">
            <HeroArt />
            <div className="absolute -bottom-4 -left-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg">
              <p className="text-2xl font-bold text-brand-600">5,000+</p>
              <p className="text-xs text-slate-500">tanks cleaned</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4">
          {[
            ["5,000+", "Tanks cleaned"],
            ["1,200+", "Happy customers"],
            ["4.8★", "Average rating"],
            ["50+", "Technicians"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-extrabold text-slate-900">{v}</p>
              <p className="text-sm text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <Section
        id="services"
        title="What we do"
        subtitle="End-to-end cleaning for every kind of tank."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 font-bold text-slate-800">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Why us */}
      <section id="why" className="bg-slate-50">
        <Section
          title="Why choose AquaClean"
          subtitle="The details that make us different."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {why.map((w) => (
              <div key={w.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="text-3xl">{w.icon}</div>
                <h3 className="mt-3 font-bold text-slate-800">{w.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{w.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* How it works */}
      <Section
        title="How it works"
        subtitle="Three simple steps to clean water."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 font-bold text-slate-800">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50">
        <Section
          title="Simple, honest pricing"
          subtitle="No hidden fees. Pay per visit or save with an annual plan."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border bg-white p-6 ${
                  p.popular
                    ? "border-brand-500 shadow-xl ring-2 ring-brand-200"
                    : "border-slate-200 shadow-sm"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-bold text-slate-800">{p.name}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {p.price}
                  </span>{" "}
                  <span className="text-sm text-slate-400">{p.unit}</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-brand-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-6 block">
                  <Button
                    className="w-full"
                    variant={p.popular ? "primary" : "secondary"}
                  >
                    Get started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* Gallery */}
      <Section title="Our work" subtitle="Spotless results, every time.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {gallery.map((src, i) => (
            <div
              key={i}
              className="aspect-[3/2] overflow-hidden rounded-2xl bg-brand-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Tank cleaning work"
                className="h-full w-full object-cover transition hover:scale-105"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <section className="bg-slate-50">
        <Section
          title="What customers say"
          subtitle="Real feedback from homes and businesses."
        >
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-6 shadow-sm">
                <StarRating value={t.rating} readOnly size="sm" />
                <p className="mt-3 text-sm text-slate-600">“{t.text}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}
                  >
                    {t.initials}
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {t.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* FAQ */}
      <Section
        id="faq"
        title="Frequently asked questions"
        subtitle="Everything you need to know."
      >
        <LandingFaq />
      </Section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-cyan-500">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold">Ready for cleaner water?</h2>
          <p className="mt-2 text-brand-50">
            Book your first tank cleaning today — quick, affordable, and fully
            documented.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <button className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 shadow hover:bg-brand-50">
              Book now
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-brand-700">
              <span className="text-2xl">💧</span> AquaClean
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Professional water tank cleaning & disinfection you can trust.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-700">Company</p>
            <ul className="mt-2 space-y-1 text-slate-500">
              <li>
                <a href="#services" className="hover:text-brand-700">
                  Services
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-brand-700">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-brand-700">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-700">Contact</p>
            <ul className="mt-2 space-y-1 text-slate-500">
              <li>📞 1800-123-456</li>
              <li>✉️ hello@aquaclean.example</li>
              <li>
                <Link
                  href="/login"
                  className="text-brand-600 hover:text-brand-700"
                >
                  Staff login
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} AquaClean. Demo landing page.
        </div>
      </footer>
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900">{title}</h2>
        <p className="mt-2 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function HeroArt() {
  return (
    <svg
      viewBox="0 0 400 360"
      className="w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fbeff" />
          <stop offset="1" stopColor="#0069a6" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="180" r="170" fill="#e0f2fe" />
      {/* tank body */}
      <rect
        x="120"
        y="120"
        width="160"
        height="170"
        rx="24"
        fill="url(#tank)"
      />
      <rect
        x="120"
        y="120"
        width="160"
        height="170"
        rx="24"
        fill="none"
        stroke="#0a4a71"
        strokeWidth="3"
        opacity="0.25"
      />
      {/* water level */}
      <rect
        x="132"
        y="200"
        width="136"
        height="78"
        rx="12"
        fill="url(#water)"
        opacity="0.9"
      />
      {/* lid */}
      <rect x="150" y="100" width="100" height="26" rx="13" fill="#055989" />
      {/* sparkle */}
      <g fill="#ffffff">
        <path
          d="M250 150 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 z"
          opacity="0.9"
        />
        <circle cx="170" cy="240" r="6" opacity="0.7" />
        <circle cx="220" cy="255" r="4" opacity="0.6" />
      </g>
      {/* droplet */}
      <path
        d="M320 70 c0 0 -26 30 -26 48 a26 26 0 1 0 52 0 c0 -18 -26 -48 -26 -48 z"
        fill="url(#water)"
      />
    </svg>
  );
}

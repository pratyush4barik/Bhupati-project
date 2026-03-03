'use client';

import { CSSProperties, MouseEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  BadgeCheck,
  ChevronDown,
  Lightbulb,
  Linkedin,
  Sparkles,
  Wallet,
  WandSparkles,
  Waypoints,
  X,
} from "lucide-react";

const navItems = [
  { label: "Home", target: "home" },
  { label: "About us", target: "about-us" },
  { label: "Services", target: "services" },
  { label: "Work", target: "work" },
  { label: "Reviews", target: "awards" },
];
const heroLine1 = "Where your";
const heroLine2 = "subscriptions";
const heroLine3 = "finally make sense";
const platformCards = [
  { name: "Coursera", src: "/logos/Coursera_logo_(2020).svg" },
  { name: "PlayStation", src: "/logos/PlayStation_logo.svg" },
  { name: "Xbox", src: "/logos/xbox-icon.svg" },
  { name: "ChatGPT", src: "/logos/ChatGPT-Logo.svg" },
  { name: "Notion", src: "/logos/notion-icon.svg" },
  { name: "Canva", src: "/logos/canva-icon.svg" },
  { name: "Google One", src: "/logos/Google_One_logo.svg" },
  { name: "YouTube Music", src: "/logos/Youtube_Music_icon.svg" },
  { name: "Gaana", src: "/logos/Gaana_logo.svg" },
  { name: "Apple Music", src: "/logos/apple-music-svgrepo-com.svg" },
  { name: "Spotify", src: "/logos/Spotify_icon.svg" },
  { name: "HBO Max", src: "/logos/HBO_Max_Logo_(October_2019).svg" },
  { name: "Disney", src: "/logos/Disney_wordmark.svg" },
  { name: "Amazon Prime", src: "/logos/icons8-amazon-prime.svg" },
  { name: "Apple TV", src: "/logos/appletv-svgrepo-com.svg" },
  { name: "Netflix", src: "/logos/netflix-logo-icon.svg" },
];
const aboutStats = [
  { value: 40, label: "Total Hours Invested", pace: "fast" as const },
  { value: 4, label: "Total Team Members", pace: "slow" as const },
  { value: 12, label: "Design Awards", pace: "mid" as const },
];
const services = [
  { title: "Virtual\nwallet", icon: Wallet, tone: "bg-violet-900/40 text-violet-400" },
  { title: "Group\ndistrubution", icon: BadgeCheck, tone: "bg-rose-900/40 text-rose-400" },
  { title: "Ghost\nagent", icon: Sparkles, tone: "bg-sky-900/40 text-sky-400" },
  { title: "Ussage\nTracking", icon: WandSparkles, tone: "bg-amber-900/40 text-amber-400" },
  { title: "Subscription\nanalysis", icon: BarChart3, tone: "bg-green-900/40 text-green-400" },
];
const workCards = [
  {
    title: "Wallet",
    src: "/Screenshot 2026-02-15 132835.png",
  },
  {
    title: "Existing Groups",
    src: "/Screenshot 2026-02-15 132908.png",
  },
  {
    title: "Wallet Overview",
    src: "/Screenshot 2026-02-15 132816.png",
  },
  {
    title: "Transaction history",
    src: "/Screenshot 2026-02-15 132920.png",
  },
];
const faqItems = [
  "What services does PayXen offer?",
  "How long does a typical setup take?",
  "How is pricing structured at PayXen?",
  "Do you offer ongoing support after onboarding?",
  "How often will I receive updates on my subscriptions?",
];

function letterDelay(ms: number): CSSProperties & Record<"--letter-delay", string> {
  return { "--letter-delay": `${ms}ms` };
}

function renderAnimatedLetters(text: string, baseDelay: number, playHeroAnim: boolean) {
  return text.split("").map((char, idx) => (
    <span
      key={`${char}-${baseDelay}-${idx}`}
      className={`${playHeroAnim ? "letter-from-right" : "letter-hidden"} inline-block`}
      style={letterDelay(baseDelay + idx * 48)}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-content-center rounded-full bg-white">
        <div className="h-3.5 w-3.5 rotate-45 rounded-[3px] border-[3px] border-zinc-900" />
      </div>
      <span className="text-[30px] font-semibold leading-none tracking-tight sm:text-[22px]">PayXen</span>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [playHeroAnim, setPlayHeroAnim] = useState(false);
  const [aboutCounts, setAboutCounts] = useState<number[]>(aboutStats.map(() => 0));
  const aboutAnimatedRef = useRef(false);
  const aboutStatsRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const aboutSectionRef = useRef<HTMLElement | null>(null);
  const [aboutReveal, setAboutReveal] = useState(0);
  const reviewsSectionRef = useRef<HTMLElement | null>(null);
  const [reviewsParallaxProgress, setReviewsParallaxProgress] = useState(0);

  const handleNavClick = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const headerOffset = 116;
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const handleServiceCardMove = (event: MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--card-rx", `${-y * 7}deg`);
    card.style.setProperty("--card-ry", `${x * 9}deg`);
    card.style.setProperty("--card-ty", "-12px");
  };

  const resetServiceCard = (event: MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    card.style.setProperty("--card-rx", "0deg");
    card.style.setProperty("--card-ry", "0deg");
    card.style.setProperty("--card-ty", "0px");
  };

  const getReviewsParallaxStyle = (side: "left" | "right", strength = 1): CSSProperties => {
    const direction = side === "left" ? -1 : 1;
    const t = reviewsParallaxProgress;
    const eased = t * t * (3 - 2 * t);
    const x = direction * (1 - eased) * 120 * strength;
    const y = (1 - eased) * 16;
    const scale = 0.982 + eased * 0.018;

    return {
      transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
      opacity: 0.88 + eased * 0.12,
      willChange: "transform, opacity",
    };
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => setPlayHeroAnim(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const section = reviewsSectionRef.current;
        if (!section) {
          ticking = false;
          return;
        }

        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        // Longer range: starts before section fully enters and completes at viewport top.
        const start = vh * 1.15;
        const end = 0;
        const raw = (start - rect.top) / (start - end);
        const clamped = Math.max(0, Math.min(1, raw));
        setReviewsParallaxProgress(clamped);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const heroSection = heroSectionRef.current;
        if (!heroSection) {
          ticking = false;
          return;
        }

        const heroRect = heroSection.getBoundingClientRect();
        const vh = window.innerHeight || 1;

        const scrollY = window.scrollY;
        const heroStartY = scrollY + heroRect.top;
        const heroEndY = scrollY + heroRect.bottom - vh * 0.22;
        const total = Math.max(heroEndY - heroStartY, 1);
        const progress = (scrollY - heroStartY) / total;
        const clamped = Math.max(0, Math.min(1, progress));
        const eased = clamped * clamped * (3 - 2 * clamped);
        setAboutReveal(eased);
        ticking = false;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    const rootEl = aboutStatsRef.current;
    if (!rootEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || aboutAnimatedRef.current) return;
        aboutAnimatedRef.current = true;

        const duration = 1900;
        const start = performance.now();
        const easingByPace = {
          fast: 0.82, // rises earlier but still smooth
          mid: 1.08, // balanced pace
          slow: 1.42, // rises later but without harsh lag
        } as const;

        const smoothstep = (x: number) => x * x * (3 - 2 * x);

        const animate = (now: number) => {
          const elapsed = now - start;
          const t = Math.min(elapsed / duration, 1);

          setAboutCounts(
            aboutStats.map((stat) => {
              const paced = Math.pow(t, easingByPace[stat.pace]);
              const eased = smoothstep(paced);
              return Math.round(stat.value * eased);
            })
          );

          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            setAboutCounts(aboutStats.map((stat) => stat.value));
          }
        };

        requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(rootEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#111318] to-[#151210] text-zinc-100">
      <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6">
        <div ref={heroSectionRef} id="home">
          <header className="fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-[1180px] px-4 pt-4 sm:px-6">
              <div className="flex items-center justify-between gap-3 rounded-[100px] border border-white/10 bg-zinc-900/80 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <BrandMark />

              <nav className="hidden items-center gap-1 rounded-full bg-zinc-800 p-1 lg:flex">
                {navItems.map((item, idx) => (
                  <Link
                    key={item.label}
                    href={`#${item.target}`}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavClick(item.target);
                    }}
                    className={`rounded-full px-4 py-1 text-[22px] transition xl:text-[14px] ${
                      idx === 0 ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:bg-zinc-700/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[14px] font-medium text-zinc-900 transition hover:bg-zinc-200"
                >
                  Login
                  <span className="grid h-7 w-7 place-content-center rounded-full bg-zinc-900 text-white">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[900px] px-6 pb-14 pt-28 text-center sm:px-8 sm:pb-16 sm:pt-32">
          <h1 className="text-[62px] font-semibold leading-[1.06] tracking-tight text-white sm:text-[84px] lg:text-[124px]">
            <span className="block">{renderAnimatedLetters(heroLine1, 0, playHeroAnim)}</span>
            <span className="block">{renderAnimatedLetters(heroLine2, 520, playHeroAnim)}</span>
            <span className="mt-3 block font-serif text-[62px] italic font-medium sm:text-[84px] lg:text-[106px]">
              {renderAnimatedLetters(heroLine3, 980, playHeroAnim)}
            </span>
          </h1>

            <div className={`${playHeroAnim ? "paragraph-load-up" : "paragraph-hidden"} mx-auto max-w-4xl`}>
              <p className="mx-auto mt-6 text-[16px] leading-relaxed text-zinc-400 sm:text-[38px] lg:text-[40px] xl:text-[16px]">
                PayXen brings all your subscriptions into one intelligent dashboard, helping you track usage,
                manage renewals, and stay in control of every recurring payment.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/signup")}
                className="inline-flex items-center gap-3 rounded-full bg-[#4a34ff] px-7 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#3c29df]"
              >
                Get Started
                <span className="grid h-8 w-8 place-content-center rounded-full bg-white text-zinc-900">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </button>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[0, 1, 2, 3].map((person) => (
                    <div
                      key={person}
                      className="h-9 w-9 rounded-full border-2 border-zinc-700 bg-gradient-to-br from-zinc-600 to-zinc-400"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-[18px] leading-none text-amber-500">?????</p>
                  <p className="mt-1 text-[16px] text-zinc-400">Trusted by 200+ clients</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="px-6 pb-20 pt-16 sm:px-10 sm:pt-20">
          <div className="mx-auto max-w-[1220px]">
            <div className="mb-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-zinc-700/90" />
              <p className="whitespace-nowrap text-center text-[15px] text-zinc-400">
                Integrated with 15+ leading platforms to power your subscription ecosystem.
              </p>
              <div className="h-px flex-1 bg-zinc-700/90" />
            </div>

            <div className="logo-marquee">
              <div className="logo-marquee-track">
                {[...platformCards, ...platformCards].map((platform, idx) => (
                  <div
                    key={`${platform.name}-${idx}`}
                    className="flex h-20 min-w-44 items-center justify-center px-4"
                  >
                    <Image
                      src={platform.src}
                      alt={platform.name}
                      width={112}
                      height={40}
                      className="h-10 w-28 object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="about-us" ref={aboutSectionRef} className="px-6 pb-24 pt-10 sm:px-10 sm:pt-14">
          <div className="mx-auto max-w-[1280px]">
            <h2
              className="about-heading-reveal mx-auto max-w-[980px] text-center text-[26px] font-semibold leading-[1.2] tracking-tight text-white sm:text-[40px] lg:text-[46px]"
              style={{ "--about-reveal": String(aboutReveal) } as CSSProperties}
            >
              Transforming the way you manage{" "}
              <span className="about-heading-dynamic">
                subscriptions with intelligence, transparency &amp; control
              </span>
            </h2>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-900/40 px-3 py-1.5 text-violet-400 sm:px-5">
                <Sparkles className="h-4 w-4" />
                <span className="font-serif text-[18px] italic sm:text-[26px]">Escrow wallet</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-900/40 px-3 py-1.5 text-sky-400 sm:px-5">
                <Lightbulb className="h-4 w-4" />
                <span className="font-serif text-[18px] italic sm:text-[26px]">usage</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/40 px-3 py-1.5 text-amber-400 sm:px-5">
                <Waypoints className="h-4 w-4" />
                <span className="font-serif text-[18px] italic sm:text-[26px]">Strategy</span>
              </div>
            </div>

            <div ref={aboutStatsRef} className="mt-28 grid gap-16 sm:grid-cols-3 sm:gap-0">
              {aboutStats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`text-center ${idx > 0 ? "sm:border-l sm:border-zinc-700/70 sm:pl-6" : ""} ${idx < 2 ? "sm:pr-6" : ""}`}
                >
                  <p className="text-[120px] font-semibold leading-[1.12] tracking-tight text-white sm:text-[150px]">
                    +{aboutCounts[idx]}
                  </p>
                  <p className="mt-8 text-[18px] leading-loose text-zinc-400 sm:text-[20px]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="px-6 pb-24 pt-4 sm:px-10 sm:pt-8">
          <div className="mx-auto max-w-[1280px]">
            <h2 className="text-center text-[34px] font-semibold leading-[1.16] tracking-tight text-white sm:text-[46px] lg:text-[54px]">
              <span className="block">Where Subscriptions</span>
              <span className="block font-serif italic font-medium text-zinc-400">become intentional</span>
            </h2>

            <div className="mt-24 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article
                    key={service.title}
                    onMouseMove={handleServiceCardMove}
                    onMouseLeave={resetServiceCard}
                    className={`service-parallax-card rounded-2xl p-6 shadow-[0_14px_34px_rgba(0,0,0,0.3)] ${service.tone}`}
                  >
                    <Icon className="h-7 w-7" />
                    <h3 className="mt-7 whitespace-pre-line text-[30px] font-medium leading-[1.05] text-zinc-200 sm:text-[24px]">
                      {service.title}
                    </h3>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-4xl bg-white/10 px-8 py-9 text-white sm:px-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-[46px] font-medium leading-[1.15] sm:text-[40px]">
                  See Our Work in Action.
                  <span className="block">Start Your Creative Journey with Us!</span>
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => router.push("/signup")}
                    className="inline-flex items-center gap-4 rounded-full bg-white px-7 py-2.5 text-[16px] font-medium text-zinc-900"
                  >
                    Let&apos;s Collaborate
                    <span className="grid h-9 w-9 place-content-center rounded-full bg-zinc-900 text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-4 rounded-full border border-zinc-600 px-7 py-2.5 text-[16px] font-medium text-white"
                  >
                    View Portfolio
                    <span className="grid h-9 w-9 place-content-center rounded-full bg-white text-zinc-900">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="work"
          className="bg-gradient-to-b from-[#151210] via-[#141416] to-[#0f1117] px-6 pb-18 pt-8 sm:px-10 sm:pt-10"
        >
          <div className="mx-auto max-w-[1280px]">
            <h2 className="text-center text-[30px] font-semibold leading-[1.2] tracking-tight text-white sm:text-[40px] lg:text-[46px]">
              How we transformed a small business&apos;s
              <span className="font-serif italic font-medium text-zinc-400"> online presence</span>
            </h2>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {workCards.map((card) => (
                <article
                  key={card.title}
                  className="relative"
                >
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                    <div className="relative h-[360px] w-full sm:h-[420px]">
                      <Image
                        src={card.src}
                        alt={card.title}
                        fill
                        className="object-cover object-top drop-shadow-[0_20px_36px_rgba(15,23,42,0.22)]"
                      />
                    </div>
                  </div>
                  <h3 className="relative z-30 mt-4 inline-block rounded-xl bg-zinc-800/90 px-2 py-1 text-[24px] font-medium leading-none text-zinc-200 sm:text-[22px]">
                    {card.title}
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="awards" ref={reviewsSectionRef} className="bg-zinc-950 px-6 pb-24 pt-4 sm:px-10 sm:pt-8">
          <div className="mx-auto max-w-[1280px]">
            <h2 className="text-center text-[38px] font-semibold leading-[1.14] tracking-tight text-white sm:text-[52px] lg:text-[64px]">
              What our satisfied customers
              <span className="block">
                are <span className="font-serif italic font-medium text-zinc-400">saying about us</span>
              </span>
            </h2>

            <div className="mt-12 grid gap-6 lg:grid-cols-[2.2fr_1fr]">
              <article
                className="relative overflow-hidden rounded-3xl bg-zinc-900 text-white"
                style={getReviewsParallaxStyle("left", 1)}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#243447,transparent_45%)] opacity-50" />
                <div className="relative p-7 sm:p-9">
                  <p className="text-sm uppercase tracking-wider text-zinc-300">Customer Stories</p>
                  <div className="mt-6 h-[360px] rounded-2xl bg-white/5" />
                  <p className="mt-8 max-w-4xl text-[24px] leading-[1.25] sm:text-[18px]">
                    PayXen&apos;s expertise transformed my vision into success with creativity, precision,
                    and a deep understanding of my goals.
                  </p>
                  <p className="mt-5 text-[17px]">Sarah Mitchell</p>
                  <p className="text-[15px] text-zinc-300">Founder of Chipsland</p>
                </div>
              </article>

              <article className="rounded-3xl bg-[#ece28c] p-8" style={getReviewsParallaxStyle("right", 0.8)}>
                <p className="text-[13px] uppercase tracking-wide text-zinc-700">Facts &amp; Numbers</p>
                <p className="mt-40 text-[64px] font-semibold leading-none text-zinc-900 sm:mt-28 sm:text-[56px]">
                  91%
                </p>
                <p className="mt-4 text-[26px] leading-[1.18] text-zinc-900 sm:text-[22px]">
                  clients recommend our design services.
                </p>
              </article>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
              <article className="rounded-3xl bg-zinc-900 p-7 text-white" style={getReviewsParallaxStyle("left", 1.35)}>
                <p className="text-sm uppercase tracking-wider text-zinc-300">Customer Stories</p>
                <p className="mt-8 text-[24px] font-medium leading-[1.22] sm:text-[20px]">
                  Their creativity and attention to detail transformed our brand completely!
                </p>
                <div className="mt-8 h-64 rounded-2xl bg-[linear-gradient(145deg,#efe8d5,#b6d8ff)]" />
              </article>

              <article className="rounded-3xl bg-zinc-800/60 p-8" style={getReviewsParallaxStyle("right", 1.35)}>
                <p className="text-sm uppercase tracking-wider text-zinc-400">Customer Stories</p>
                <p className="mt-8 max-w-4xl text-[24px] leading-[1.28] text-zinc-100 sm:text-[20px]">
                  &ldquo;PayXen brought our ideas to life with exceptional creativity and precision, exceeding expectations.&rdquo;
                </p>
                <p className="mt-52 text-[17px] text-zinc-100 sm:mt-36">Sarah Mitchell</p>
                <p className="text-[15px] text-zinc-400">Marketing Head at TalentConnect</p>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-zinc-950 px-6 pb-24 pt-2 sm:px-10">
          <div className="mx-auto max-w-[1080px]">
            <h2 className="text-center text-[42px] font-semibold leading-[1.14] tracking-tight text-white sm:text-[58px] lg:text-[68px]">
              Got questions?
              <span className="block">
                We&apos;ve got <span className="font-serif italic font-medium text-zinc-400">answers</span>
              </span>
            </h2>

            <div className="mt-10 space-y-4">
              {faqItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center justify-between rounded-3xl border border-zinc-700 bg-zinc-800/60 px-6 py-5 text-left text-[20px] font-medium text-zinc-100 transition hover:bg-zinc-800 sm:text-[17px]"
                >
                  <span>{item}</span>
                  <ChevronDown className="h-5 w-5 text-zinc-400" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-b-[2rem] bg-zinc-950 px-6 pb-20 pt-2 sm:px-10">
          <div className="mx-auto max-w-[1280px] rounded-[2rem] border border-zinc-700 bg-gradient-to-r from-[#0d1e2e] via-[#181818] to-[#1f1a0d] p-10 text-center sm:p-14">
            <h3 className="text-[52px] font-semibold leading-[1.05] text-white sm:text-[44px]">
              Innovative Solutions for{" "}
              <span className="font-serif italic font-medium text-zinc-400">bold brands</span>
            </h3>
            <p className="mx-auto mt-6 max-w-[760px] text-[20px] text-zinc-400 sm:text-[16px]">
              Looking to elevate your brand? We craft immersive experiences that captivate, engage, and make your business unforgettable in every interaction.
            </p>
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="mt-8 inline-flex items-center gap-4 rounded-full bg-white px-7 py-3 text-[16px] font-medium text-zinc-900"
            >
              Let&apos;s craft together
              <span className="grid h-9 w-9 place-content-center rounded-full bg-zinc-900 text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        </section>

        <footer className="bg-[#151210] px-6 pb-10 pt-10 sm:px-10">
          <div className="mx-auto grid max-w-[1280px] gap-10 border-t border-zinc-700 pt-12 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <BrandMark />
              <p className="mt-5 max-w-[480px] text-[20px] leading-relaxed text-zinc-400 sm:text-[16px]">
                Empowering businesses with innovative solutions. Let&apos;s create something amazing together.
              </p>
              <div className="mt-6 flex items-center gap-4 text-zinc-400">
                <X className="h-6 w-6" />
                <Linkedin className="h-6 w-6" />
                <div className="h-6 w-6 rounded-full border-2 border-zinc-600" />
                <div className="h-6 w-6 rounded-full border-2 border-zinc-600" />
              </div>
            </div>

            <div>
              <h4 className="text-[20px] font-medium text-zinc-100 sm:text-[15px]">Sitemap</h4>
              <ul className="mt-5 space-y-3 text-[20px] text-zinc-400 sm:text-[14px]">
                <li>About us</li>
                <li>Work</li>
                <li>Services</li>
                <li>Pricing</li>
              </ul>
            </div>

            <div>
              <h4 className="text-[20px] font-medium text-zinc-100 sm:text-[15px]">Other Pages</h4>
              <ul className="mt-5 space-y-3 text-[20px] text-zinc-400 sm:text-[14px]">
                <li>Contact Us</li>
                <li>Error 404</li>
              </ul>
            </div>

            <div>
              <h4 className="text-[20px] font-medium text-zinc-100 sm:text-[15px]">Contact Details</h4>
              <ul className="mt-5 space-y-3 text-[20px] text-zinc-400 sm:text-[14px]">
                <li>81 Rivington Street London EC2A 3AY</li>
                <li>hello@awake.agnecy</li>
                <li>0105 192 3556</li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-10 flex max-w-[1280px] flex-col items-start justify-between gap-4 border-t border-zinc-700 pt-6 text-[18px] text-zinc-400 sm:flex-row sm:text-[14px]">
            <p>�2025 Awake. All Rights Reserved. Powered by Webflow</p>
            <div className="flex items-center gap-8">
              <span>Style Guide</span>
              <span>Licenses</span>
              <span>Changelog</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

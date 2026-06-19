import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import type { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSiteSettingsStore } from "@/store/siteSettingsStore";

interface HeroBannerProps {
  channels: Channel[];
}

interface Slide {
  id: string;
  isCustom: boolean;
  title: string;
  subtitle?: string;
  description: string;
  badgeText: string;
  buttonText: string;
  buttonLink: string;
  logo?: string;
  group?: string;
}

export function HeroBanner({ channels }: HeroBannerProps) {
  const [active, setActive] = useState(0);
  const hero = useSiteSettingsStore((s) => s.hero);

  const slides: Slide[] = useMemo(() => {
    const channelSlides: Slide[] = channels.slice(0, 6).map((ch) => ({
      id: ch.id,
      isCustom: false,
      title: ch.name,
      description: `Stream ${ch.name} live in HD quality. Part of the ${ch.group} collection on Shahriar TV — your premium family entertainment hub.`,
      badgeText: "LIVE NOW",
      buttonText: "Watch Now",
      buttonLink: `/watch/${ch.id}`,
      logo: ch.logo,
      group: ch.group,
    }));

    if (hero.enabled && hero.title.trim()) {
      const customSlide: Slide = {
        id: "admin-hero",
        isCustom: true,
        title: hero.title,
        subtitle: hero.subtitle,
        description: hero.description || "Welcome to Shahriar TV — Your Family Entertainment Hub.",
        badgeText: hero.badgeText || "ANNOUNCEMENT",
        buttonText: hero.buttonText || "Explore",
        buttonLink: hero.buttonLink || "/live",
      };
      return [customSlide, ...channelSlides];
    }

    return channelSlides;
  }, [channels, hero]);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => setActive((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    // Intentional: reset the active slide whenever the hero data itself
    // changes (e.g. admin edits it). Not a hot path.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0);
  }, [hero.enabled, hero.title]);

  if (slides.length === 0) {
    return (
      <div className="relative h-[50dvh] min-h-[360px] w-full overflow-hidden bg-gradient-to-br from-surface-200 via-surface-100 to-surface-0 sm:h-[60dvh]">
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mb-4" />
          <p className="text-white/60">Loading featured channels...</p>
        </div>
      </div>
    );
  }

  const current = slides[active % slides.length];

  return (
    <div className="relative h-[55dvh] min-h-[420px] w-full overflow-hidden sm:h-[65dvh] lg:h-[75dvh]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-surface-100 to-surface-0" />
          {current.logo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] blur-sm">
              <img src={current.logo} alt="" className="h-2/3 w-2/3 object-contain" />
            </div>
          )}
          {current.isCustom && (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
              <Megaphone className="h-2/3 w-2/3" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-0/90 via-surface-0/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="live">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> {current.badgeText}
                </Badge>
                {current.group && <Badge variant="outline">{current.group}</Badge>}
              </div>
              <h1 className="font-display text-3xl font-extrabold text-white text-shadow-lg sm:text-5xl lg:text-6xl">
                {current.title}
              </h1>
              {current.subtitle && (
                <p className="mt-2 text-base font-semibold text-brand-300 sm:text-lg">{current.subtitle}</p>
              )}
              <p className="mt-3 max-w-lg text-sm text-white/70 sm:text-base">{current.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={current.buttonLink}>
                  <Button variant="default" size="lg" className="shadow-xl">
                    <Play className="h-5 w-5 fill-black" /> {current.buttonText}
                  </Button>
                </Link>
                {!current.isCustom && current.group && (
                  <Link to={`/category/${current.group.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Button variant="glass" size="lg">
                      <Info className="h-5 w-5" /> More Like This
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="mt-8 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-8 bg-brand-500" : "w-4 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Nav arrows */}
      <button
        onClick={() => setActive((p) => (p - 1 + slides.length) % slides.length)}
        className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full glass p-2 text-white hover:bg-white/20 transition-colors sm:block lg:left-4"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setActive((p) => (p + 1) % slides.length)}
        className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full glass p-2 text-white hover:bg-white/20 transition-colors sm:block lg:right-4"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

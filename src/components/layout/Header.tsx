import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, X, Menu, Settings, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/common/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/userStore";
import { useChannelSearch } from "@/hooks/useChannelSearch";
import { useAllChannels } from "@/hooks/useAllChannels";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Live TV", href: "/live" },
  { label: "Schedule", href: "/schedule" },
  { label: "Bangla TV", href: "/category/bangla" },
  { label: "Sports", href: "/category/sports" },
  { label: "FIFA", href: "/category/fifa" },
];

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { channels } = useAllChannels();
  const addSearchTerm = useUserStore((s) => s.addSearchTerm);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results } = useChannelSearch(channels, query);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    // Intentional: close the search overlay and clear its query whenever
    // the route changes. Not a hot path.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchOpen(false);
    setQuery("");
  }, [location.pathname]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    addSearchTerm(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled ? "glass-strong shadow-lg shadow-black/20" : "bg-gradient-to-b from-black/60 to-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors lg:hidden focus-ring"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring",
                location.pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Desktop search */}
          <form onSubmit={handleSubmit} className="relative hidden md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search channels..."
                className="w-56 pl-9 lg:w-72"
                onFocus={() => setSearchOpen(true)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {searchOpen && query && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl glass-strong shadow-2xl"
                >
                  <div className="max-h-96 overflow-y-auto p-1.5">
                    {results.slice(0, 6).map((ch) => (
                      <Link
                        key={ch.id}
                        to={`/watch/${ch.id}`}
                        onClick={() => {
                          addSearchTerm(query);
                          setSearchOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/10 transition-colors"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-300 flex items-center justify-center">
                          {ch.logo ? (
                            <img src={ch.logo} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <Search className="h-4 w-4 text-white/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{ch.name}</p>
                          <p className="truncate text-xs text-white/40">{ch.group}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <button
                    onClick={handleSubmit}
                    className="block w-full border-t border-white/10 p-2.5 text-center text-xs font-semibold text-brand-400 hover:bg-white/5 transition-colors"
                  >
                    See all results for "{query}"
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => navigate("/search")}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Link to="/admin">
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Admin">
              <ShieldCheck className="h-5 w-5" />
            </Button>
          </Link>

          <Link to="/settings">
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

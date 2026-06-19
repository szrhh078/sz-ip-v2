import { Link } from "react-router-dom";
import { Tv2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-brand shadow-lg shadow-brand-600/30">
        <Tv2 className="h-10 w-10 text-white" />
      </div>
      <h1 className="font-display text-4xl font-extrabold text-white">404</h1>
      <p className="text-white/60">This channel or page doesn't exist.</p>
      <Link to="/">
        <Button variant="brand">Back to Home</Button>
      </Link>
    </div>
  );
}

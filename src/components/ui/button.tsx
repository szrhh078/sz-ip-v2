import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-white/90 shadow-lg shadow-black/20",
        brand: "gradient-brand text-white hover:brightness-110 shadow-lg shadow-brand-600/30",
        secondary: "bg-surface-300 text-white hover:bg-surface-400",
        ghost: "hover:bg-white/10 text-white",
        outline: "border border-white/20 bg-transparent hover:bg-white/10 text-white",
        glass: "glass text-white hover:bg-white/10",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        link: "text-brand-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components -- standard shadcn pattern: component + its cva variants
export { Button, buttonVariants };

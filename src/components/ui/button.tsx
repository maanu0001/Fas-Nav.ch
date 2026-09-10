import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-subtle hover:bg-primary-800 active:bg-primary-900",
        accent:
          "bg-accent text-accent-foreground shadow-subtle hover:bg-accent-600 active:bg-accent-700",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-primary-100 active:bg-primary-200",
        outline:
          "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-subtle hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
        inverse: "bg-white text-brand shadow-subtle hover:bg-white/90",
        inverseOutline:
          "border border-white/35 bg-white/5 text-white backdrop-blur hover:bg-white/15",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export type ButtonLinkProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

export function ButtonLink({ className, variant, size, block, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  );
}

export { buttonVariants };

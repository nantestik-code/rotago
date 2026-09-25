import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-semibold ring-offset-background transition-[transform,box-shadow,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden border-primary/80 bg-[linear-gradient(180deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.88)_100%)] text-primary-foreground shadow-[0_12px_24px_-12px_hsl(var(--primary)/0.72)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/35 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_hsl(var(--primary)/0.85)]",
        destructive:
          "border-destructive/70 bg-[linear-gradient(180deg,hsl(var(--destructive))_0%,hsl(var(--destructive)/0.88)_100%)] text-destructive-foreground shadow-[0_12px_24px_-12px_hsl(var(--destructive)/0.55)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_hsl(var(--destructive)/0.7)]",
        outline:
          "border-slate-200/80 bg-white/90 text-slate-700 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
        secondary:
          "border-transparent bg-slate-900/5 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:-translate-y-0.5 hover:bg-slate-900/8 hover:text-slate-900",
        ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2.5",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

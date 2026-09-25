import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)] ring-offset-background transition-[border-color,box-shadow,background-color] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-400 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

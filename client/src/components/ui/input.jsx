import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50 aria-invalid:border-destructive flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm shadow-xs transition-[box-shadow,color] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };

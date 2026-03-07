import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm shadow-xs",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({ className, variant, ...props }) {
  return (
    <div
      role="alert"
      data-slot="alert"
      data-variant={variant}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return (
    <div data-slot="alert-description" className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  );
}

export { Alert, AlertDescription, AlertTitle };

import * as React from "react";

import { cn } from "@/lib/utils";

const Form = React.forwardRef(function Form({ className, ...props }, ref) {
  return <form ref={ref} className={cn("space-y-4", className)} {...props} />;
});

function FormField({ className, ...props }) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

function FormMessage({ className, children, ...props }) {
  const hasMessage =
    typeof children === "string" ? children.trim().length > 0 : Boolean(children);

  return (
    <p
      className={cn("text-destructive min-h-5 text-xs leading-relaxed", className)}
      role={hasMessage ? "alert" : undefined}
      aria-live={hasMessage ? "polite" : undefined}
      {...props}
    >
      {children}
    </p>
  );
}

Form.displayName = "Form";

export { Form, FormField, FormMessage };

import * as React from "react";

import { cn } from "@/lib/utils";

// shadcn-style Label. WHY no @radix-ui/react-label: our forms only need
// htmlFor/id wiring; the radix wrapper adds a dependency for nothing.
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
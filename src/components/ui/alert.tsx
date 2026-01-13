import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-md border p-4 text-sm",
        variant === "destructive"
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          : "border-border bg-muted/40 text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";


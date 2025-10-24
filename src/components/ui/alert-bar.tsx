import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const alertBarVariants = cva(
  "relative w-full flex items-center gap-3 px-4 py-3 text-sm font-medium",
  {
    variants: {
      variant: {
        info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-l-4 border-blue-500",
        warning:
          "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-l-4 border-yellow-500",
        error:
          "bg-red-500/10 text-red-700 dark:text-red-400 border-l-4 border-red-500",
        critical:
          "bg-red-600/20 text-red-800 dark:text-red-300 border-l-4 border-red-600",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

export interface AlertBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertBarVariants> {
  dismissable?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const AlertBar = React.forwardRef<HTMLDivElement, AlertBarProps>(
  (
    {
      className,
      variant,
      dismissable = true,
      onDismiss,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    if (!isVisible) return null;

    const defaultIcon = React.useMemo(() => {
      switch (variant) {
        case "warning":
          return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
        case "error":
        case "critical":
          return <AlertCircle className="h-4 w-4 flex-shrink-0" />;
        case "info":
        default:
          return <Info className="h-4 w-4 flex-shrink-0" />;
      }
    }, [variant]);

    return (
      <div
        ref={ref}
        className={cn(alertBarVariants({ variant }), className)}
        role="alert"
        {...props}
      >
        {icon ?? defaultIcon}
        <div className="flex-1">{children}</div>
        {dismissable && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

AlertBar.displayName = "AlertBar";

export { AlertBar, alertBarVariants };

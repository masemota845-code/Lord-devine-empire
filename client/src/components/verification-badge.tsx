import { Crown, BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  isVerified: boolean;
  isAdmin?: boolean;
  size?: "sm" | "md" | "lg";
}

export function VerificationBadge({ isVerified, isAdmin, size = "md" }: VerificationBadgeProps) {
  if (!isVerified && !isAdmin) return null;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (isAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-0.5 ml-1" data-testid="badge-admin-verified">
            <Crown className={`${sizeClasses[size]} text-yellow-500`} />
            <BadgeCheck className={`${sizeClasses[size]} text-blue-500`} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Platform Administrator</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center ml-1" data-testid="badge-verified">
          <BadgeCheck className={`${sizeClasses[size]} text-blue-500`} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Verified User</p>
      </TooltipContent>
    </Tooltip>
  );
}

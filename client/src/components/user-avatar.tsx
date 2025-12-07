import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerificationBadge } from "./verification-badge";

interface UserAvatarProps {
  username: string;
  profileImage?: string | null;
  isVerified?: boolean;
  isAdmin?: boolean;
  showBadge?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  username,
  profileImage,
  isVerified = false,
  isAdmin = false,
  showBadge = false,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const initials = username
    .split("_")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Avatar className={sizeClasses[size]} data-testid={`avatar-${username}`}>
        <AvatarImage src={profileImage || undefined} alt={username} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showBadge && (isVerified || isAdmin) && (
        <VerificationBadge isVerified={isVerified} isAdmin={isAdmin} size={size === "lg" ? "lg" : "md"} />
      )}
    </div>
  );
}

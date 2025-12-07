import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User, 
  Edit2, 
  Save, 
  X, 
  Calendar, 
  Wallet, 
  Star, 
  Download,
  Upload,
  Crown,
  BadgeCheck,
  Award,
  Loader2,
  Copy,
  Check
} from "lucide-react";
import { VerificationBadge } from "@/components/verification-badge";
import type { Achievement, MarketplaceListing } from "@shared/schema";

const profileSchema = z.object({
  displayName: z.string().max(50, "Display name must be less than 50 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserStats {
  totalListings: number;
  totalPurchases: number;
  totalEarnings: string;
  totalDownloads: number;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/me/stats"],
    enabled: !!user,
  });

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ["/api/users/me/achievements"],
    enabled: !!user,
  });

  const { data: recentListings } = useQuery<MarketplaceListing[]>({
    queryKey: ["/api/marketplace/my-listings"],
    enabled: !!user,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PATCH", "/api/users/me", data);
      return response.json();
    },
    onSuccess: () => {
      refreshUser();
      setIsEditing(false);
      toast({ title: "Profile updated!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyReferralCode = async () => {
    if (user?.referralCode) {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Referral code copied!" });
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case "first_upload": return Upload;
      case "top_seller": return Star;
      case "community_champion": return Award;
      case "code_master": return BadgeCheck;
      default: return Award;
    }
  };

  const getAchievementLabel = (type: string) => {
    switch (type) {
      case "first_upload": return "First Upload";
      case "top_seller": return "Top Seller";
      case "community_champion": return "Community Champion";
      case "code_master": return "Code Master";
      default: return type;
    }
  };

  const initials = (user?.username || "")
    .split("_")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="md:w-80">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4" data-testid="avatar-profile">
                <AvatarImage src={user?.profileImage || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <h2 className="text-xl font-bold" data-testid="text-username">{user?.displayName || user?.username}</h2>
                <VerificationBadge isVerified={user?.isVerified || false} isAdmin={user?.isAdmin} size="lg" />
              </div>
              <p className="text-muted-foreground">@{user?.username}</p>
              
              {user?.bio && (
                <p className="text-sm text-muted-foreground mt-4">{user.bio}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {user?.isAdmin && (
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {user?.isVerified && (
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="w-full mt-6 pt-6 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Wallet className="h-3 w-3" />
                    {user?.hasInfiniteBalance ? "Unlimited" : `$${parseFloat(user?.balance || "0").toLocaleString()}`}
                  </span>
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-6">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your display name" {...field} data-testid="input-display-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Tell us about yourself..." {...field} data-testid="input-bio" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-earnings">
                      ${parseFloat(stats?.totalEarnings || "0").toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Listings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-listings">
                      {stats?.totalListings || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-purchases">
                      {stats?.totalPurchases || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Downloads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-downloads">
                      {stats?.totalDownloads || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {user?.referralCode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Referral Program</CardTitle>
                    <CardDescription>Invite friends and earn rewards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Input value={user.referralCode} readOnly className="font-mono" data-testid="input-referral-code" />
                      <Button variant="outline" onClick={copyReferralCode} data-testid="button-copy-referral">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      You earn $100 and your friend gets $50 for each successful referral!
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Achievements</CardTitle>
                  <CardDescription>Your earned badges and accomplishments</CardDescription>
                </CardHeader>
                <CardContent>
                  {achievements && achievements.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {achievements.map((achievement) => {
                        const Icon = getAchievementIcon(achievement.type);
                        return (
                          <Badge key={achievement.id} variant="secondary" className="p-2" data-testid={`achievement-${achievement.id}`}>
                            <Icon className="h-4 w-4 mr-1" />
                            {getAchievementLabel(achievement.type)}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No achievements yet. Start using the platform to earn badges!
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

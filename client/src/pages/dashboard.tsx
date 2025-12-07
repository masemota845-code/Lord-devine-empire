import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Store, 
  Code2, 
  MessageSquare, 
  Users, 
  Terminal, 
  Wallet, 
  TrendingUp, 
  Star, 
  Download,
  Bell,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { VerificationBadge } from "@/components/verification-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalListings: number;
  totalPurchases: number;
  totalEarnings: string;
  unreadNotifications: number;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  const quickActions = [
    { title: "Marketplace", description: "Browse and sell code", icon: Store, href: "/marketplace", color: "bg-blue-500/10 text-blue-500" },
    { title: "AI Code Studio", description: "Analyze and generate code", icon: Code2, href: "/code-studio", color: "bg-purple-500/10 text-purple-500" },
    { title: "AI Chat", description: "Chat with AI assistant", icon: Sparkles, href: "/ai-chat", color: "bg-green-500/10 text-green-500" },
    { title: "Community", description: "Join the discussion", icon: Users, href: "/community", color: "bg-orange-500/10 text-orange-500" },
    { title: "Terminal", description: "Command line tools", icon: Terminal, href: "/terminal", color: "bg-cyan-500/10 text-cyan-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-bold" data-testid="text-welcome">
            Welcome back, {user?.displayName || user?.username}
          </h1>
          <VerificationBadge isVerified={user?.isVerified || false} isAdmin={user?.isAdmin} size="lg" />
        </div>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          Here's what's happening in your developer empire
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-balance">
              {user?.hasInfiniteBalance ? "Unlimited" : `$${parseFloat(user?.balance || "0").toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link href="/top-up" className="text-primary hover:underline">Add funds</Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-earnings">
                ${parseFloat(stats?.totalEarnings || "0").toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">From marketplace sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Listings</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-listings-count">
                {stats?.totalListings || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Active marketplace items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-purchases-count">
                {stats?.totalPurchases || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Items in your library</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump into any feature</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-4 p-3 rounded-lg hover-elevate cursor-pointer" data-testid={`action-${action.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest notifications</CardDescription>
            </div>
            {(stats?.unreadNotifications || 0) > 0 && (
              <Badge variant="secondary" data-testid="badge-unread-count">
                {stats?.unreadNotifications} new
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg" data-testid={`activity-${activity.id}`}>
                    <Bell className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
            <Link href="/notifications">
              <Button variant="ghost" className="w-full mt-4" data-testid="button-view-all-notifications">
                View all notifications
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {!user?.isVerified && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <CardTitle>Get Verified</CardTitle>
            </div>
            <CardDescription>
              Unlock exclusive features and boost your credibility with a verified badge
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-center">
            <Link href="/settings">
              <Button data-testid="button-get-verified">Get Verified - $5,000/month</Button>
            </Link>
            <span className="text-sm text-muted-foreground">or contact admin for special access</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

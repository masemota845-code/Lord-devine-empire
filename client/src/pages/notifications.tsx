import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  ShoppingCart, 
  DollarSign, 
  AtSign,
  Settings,
  ArrowDown,
  Loader2,
  Gift,
  Info
} from "lucide-react";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notifications/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications/all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications cleared" });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "purchase": return ShoppingCart;
      case "sale": return DollarSign;
      case "gift": return Gift;
      case "mention": return AtSign;
      case "price_drop": return ArrowDown;
      case "system": return Settings;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "purchase": return "text-blue-500";
      case "sale": return "text-green-500";
      case "gift": return "text-purple-500";
      case "mention": return "text-orange-500";
      case "price_drop": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-notifications-title">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "You're all caught up!"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            data-testid="button-mark-all-read"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            Mark all read
          </Button>
          <Button
            variant="outline"
            onClick={() => clearAllMutation.mutate()}
            disabled={clearAllMutation.isPending || !notifications?.length}
            data-testid="button-clear-all"
          >
            {clearAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear all
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 ${!notification.isRead ? "bg-muted/50" : ""}`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{notification.title}</span>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <span className="text-xs text-muted-foreground mt-2 block">
                          {formatDate(notification.createdAt as unknown as string)}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!notification.isRead && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => markReadMutation.mutate(notification.id)}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                          data-testid={`button-delete-${notification.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BellOff className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-sm">When you get notifications, they'll appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

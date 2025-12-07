import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  DollarSign, 
  Gift, 
  BadgeCheck, 
  Ban,
  Loader2,
  Search,
  Crown,
  TrendingUp,
  Store,
  MessageSquare
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { VerificationBadge } from "@/components/verification-badge";
import type { User } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  totalListings: number;
  totalTransactions: number;
  totalRevenue: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [giftAmount, setGiftAmount] = useState("");
  const [giftNote, setGiftNote] = useState("");

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const giftMoneyMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: string; note?: string }) => {
      const response = await apiRequest("POST", `/api/admin/gift-money`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Money gifted successfully!" });
      setGiftDialogOpen(false);
      setGiftAmount("");
      setGiftNote("");
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/toggle-verification/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Verification status updated!" });
    },
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", `/api/admin/toggle-suspend/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User suspension status updated!" });
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGiftMoney = () => {
    if (!selectedUser || !giftAmount) return;
    giftMoneyMutation.mutate({
      userId: selectedUser.id,
      amount: giftAmount,
      note: giftNote || undefined,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, verification, and platform settings</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <BadgeCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-verified-users">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.verifiedUsers || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-listings-admin">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.totalListings || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-transactions">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.totalTransactions || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-platform-revenue">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `$${parseFloat(stats?.totalRevenue || "0").toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all platform users</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            username={u.username}
                            profileImage={u.profileImage}
                            size="sm"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{u.displayName || u.username}</span>
                              <VerificationBadge isVerified={u.isVerified} isAdmin={u.isAdmin} size="sm" />
                            </div>
                            <span className="text-xs text-muted-foreground">@{u.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.hasInfiniteBalance ? (
                          <Badge variant="secondary">Unlimited</Badge>
                        ) : (
                          `$${parseFloat(u.balance).toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.isAdmin && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {u.isVerified && !u.isAdmin && (
                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Verified</Badge>
                          )}
                          {u.isSuspended && (
                            <Badge variant="destructive">Suspended</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt as unknown as string).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setGiftDialogOpen(true);
                            }}
                            data-testid={`button-gift-${u.id}`}
                          >
                            <Gift className="h-3 w-3 mr-1" />
                            Gift
                          </Button>
                          {!u.isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant={u.isVerified ? "secondary" : "default"}
                                onClick={() => toggleVerificationMutation.mutate(u.id)}
                                disabled={toggleVerificationMutation.isPending}
                                data-testid={`button-verify-${u.id}`}
                              >
                                <BadgeCheck className="h-3 w-3 mr-1" />
                                {u.isVerified ? "Unverify" : "Verify"}
                              </Button>
                              <Button
                                size="sm"
                                variant={u.isSuspended ? "outline" : "destructive"}
                                onClick={() => toggleSuspendMutation.mutate(u.id)}
                                disabled={toggleSuspendMutation.isPending}
                                data-testid={`button-suspend-${u.id}`}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                {u.isSuspended ? "Unsuspend" : "Suspend"}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Gift Money to User
            </DialogTitle>
            <DialogDescription>
              Send money to {selectedUser?.displayName || selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <UserAvatar
                username={selectedUser?.username || ""}
                profileImage={selectedUser?.profileImage}
                size="sm"
              />
              <div>
                <p className="font-medium">{selectedUser?.displayName || selectedUser?.username}</p>
                <p className="text-sm text-muted-foreground">Current balance: ${parseFloat(selectedUser?.balance || "0").toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-amount">Amount ($)</Label>
              <Input
                id="gift-amount"
                type="number"
                min="0"
                step="0.01"
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="input-gift-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-note">Note (optional)</Label>
              <Textarea
                id="gift-note"
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
                placeholder="Add a note..."
                data-testid="input-gift-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGiftDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGiftMoney}
              disabled={giftMoneyMutation.isPending || !giftAmount || parseFloat(giftAmount) <= 0}
              data-testid="button-confirm-gift"
            >
              {giftMoneyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Gift className="h-4 w-4 mr-2" />
              )}
              Send Gift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

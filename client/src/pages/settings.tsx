import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  BadgeCheck, 
  Key, 
  Trash2, 
  AlertTriangle,
  Loader2,
  Crown,
  Wallet
} from "lucide-react";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const purchaseVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/verification/purchase", {});
      return response.json();
    },
    onSuccess: () => {
      refreshUser();
      toast({ title: "Congratulations!", description: "You are now a verified user!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/users/me", {});
    },
    onSuccess: () => {
      window.location.href = "/auth";
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-settings-title">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle dark/light theme</p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-blue-500" />
              Verification
            </CardTitle>
            <CardDescription>Get verified and unlock benefits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.isAdmin ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Platform Administrator</p>
                  <p className="text-sm text-muted-foreground">You have permanent verification</p>
                </div>
              </div>
            ) : user?.isVerified ? (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
                <BadgeCheck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Verified User</p>
                  <p className="text-sm text-muted-foreground">
                    Expires: {user.verificationExpiry ? new Date(user.verificationExpiry).toLocaleDateString() : "Never"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium">Benefits of Verification:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="h-3 w-3 text-blue-500" />
                      Blue verified badge next to your name
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="h-3 w-3 text-blue-500" />
                      Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="h-3 w-3 text-blue-500" />
                      Featured listings in marketplace
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="h-3 w-3 text-blue-500" />
                      Access to exclusive features
                    </li>
                  </ul>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    <span className="font-medium">$5,000/month</span>
                  </div>
                  <Button
                    onClick={() => purchaseVerificationMutation.mutate()}
                    disabled={purchaseVerificationMutation.isPending || parseFloat(user?.balance || "0") < 5000}
                    data-testid="button-purchase-verification"
                  >
                    {purchaseVerificationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BadgeCheck className="h-4 w-4 mr-2" />
                    )}
                    Get Verified
                  </Button>
                </div>
                {parseFloat(user?.balance || "0") < 5000 && (
                  <p className="text-xs text-destructive">Insufficient balance. You need $5,000 to get verified.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-account">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data including:
                  </DialogDescription>
                </DialogHeader>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>All your marketplace listings</li>
                  <li>Your purchase history</li>
                  <li>Your balance and earnings</li>
                  <li>All chat messages</li>
                  <li>Your AI conversations</li>
                </ul>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteAccountMutation.mutate()}
                    disabled={deleteAccountMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteAccountMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Yes, Delete My Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

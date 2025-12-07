import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gift, 
  ShoppingCart, 
  DollarSign,
  Loader2,
  FileCode
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Purchase, MoneyGift, MarketplaceListing, User } from "@shared/schema";

interface PurchaseWithDetails extends Purchase {
  listing: MarketplaceListing;
  seller: User;
  buyer: User;
}

interface GiftWithDetails extends MoneyGift {
  sender: User;
  recipient: User;
}

export default function Transactions() {
  const { user } = useAuth();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<PurchaseWithDetails[]>({
    queryKey: ["/api/transactions/purchases"],
    enabled: !!user,
  });

  const { data: sales, isLoading: salesLoading } = useQuery<PurchaseWithDetails[]>({
    queryKey: ["/api/transactions/sales"],
    enabled: !!user,
  });

  const { data: gifts, isLoading: giftsLoading } = useQuery<GiftWithDetails[]>({
    queryKey: ["/api/transactions/gifts"],
    enabled: !!user,
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTransaction = (
    type: "purchase" | "sale" | "gift-received" | "gift-sent",
    id: string,
    title: string,
    amount: string,
    date: string | Date,
    subtitle?: string,
    transactionId?: string
  ) => {
    const icons = {
      purchase: <ArrowUpRight className="h-4 w-4" />,
      sale: <ArrowDownLeft className="h-4 w-4" />,
      "gift-received": <Gift className="h-4 w-4" />,
      "gift-sent": <Gift className="h-4 w-4" />,
    };

    const colors = {
      purchase: "text-red-500 bg-red-500/10",
      sale: "text-green-500 bg-green-500/10",
      "gift-received": "text-purple-500 bg-purple-500/10",
      "gift-sent": "text-orange-500 bg-orange-500/10",
    };

    const amountColors = {
      purchase: "text-red-500",
      sale: "text-green-500",
      "gift-received": "text-green-500",
      "gift-sent": "text-red-500",
    };

    const prefix = type === "purchase" || type === "gift-sent" ? "-" : "+";

    return (
      <div
        key={id}
        className="flex items-center gap-4 p-4 border-b last:border-0"
        data-testid={`transaction-${id}`}
      >
        <div className={`p-2 rounded-full ${colors[type]}`}>
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold ${amountColors[type]}`}>
            {prefix}${parseFloat(amount).toLocaleString()}
          </p>
          {transactionId && (
            <p className="text-xs text-muted-foreground font-mono">
              {transactionId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>
    );
  };

  const allTransactions = [
    ...(purchases?.map((p) => ({
      type: "purchase" as const,
      id: p.id,
      title: p.listing.title,
      amount: p.amount,
      date: p.createdAt,
      subtitle: `From ${p.seller.username}`,
      transactionId: p.transactionId,
    })) || []),
    ...(sales?.map((s) => ({
      type: "sale" as const,
      id: s.id,
      title: s.listing.title,
      amount: s.amount,
      date: s.createdAt,
      subtitle: `To ${s.buyer.username}`,
      transactionId: s.transactionId,
    })) || []),
    ...(gifts?.filter((g) => g.toUserId === user?.id).map((g) => ({
      type: "gift-received" as const,
      id: g.id,
      title: "Money Gift Received",
      amount: g.amount,
      date: g.createdAt,
      subtitle: `From ${g.sender.username}`,
    })) || []),
    ...(gifts?.filter((g) => g.fromUserId === user?.id).map((g) => ({
      type: "gift-sent" as const,
      id: g.id,
      title: "Money Gift Sent",
      amount: g.amount,
      date: g.createdAt,
      subtitle: `To ${g.recipient.username}`,
    })) || []),
  ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  const isLoading = purchasesLoading || salesLoading || giftsLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-transactions-title">
          <History className="h-8 w-8" />
          Transaction History
        </h1>
        <p className="text-muted-foreground">View all your purchases, sales, and gifts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="text-total-spent">
              ${purchases?.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-total-earned">
              ${sales?.reduce((sum, s) => sum + parseFloat(s.amount), 0).toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gifts Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500" data-testid="text-gifts-received">
              ${gifts?.filter((g) => g.toUserId === user?.id).reduce((sum, g) => sum + parseFloat(g.amount), 0).toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Tabs defaultValue="all">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-transactions">All</TabsTrigger>
              <TabsTrigger value="purchases" data-testid="tab-purchases">Purchases</TabsTrigger>
              <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
              <TabsTrigger value="gifts" data-testid="tab-gifts">Gifts</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="all" className="m-0">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : allTransactions.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  {allTransactions.map((t) =>
                    renderTransaction(t.type, t.id, t.title, t.amount, t.date, t.subtitle, t.transactionId)
                  )}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileCode className="h-12 w-12 mb-4 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="purchases" className="m-0">
              {purchasesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : purchases && purchases.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  {purchases.map((p) =>
                    renderTransaction("purchase", p.id, p.listing.title, p.amount, p.createdAt, `From ${p.seller.username}`, p.transactionId)
                  )}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
                  <p>No purchases yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sales" className="m-0">
              {salesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sales && sales.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  {sales.map((s) =>
                    renderTransaction("sale", s.id, s.listing.title, s.amount, s.createdAt, `To ${s.buyer.username}`, s.transactionId)
                  )}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                  <p>No sales yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gifts" className="m-0">
              {giftsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : gifts && gifts.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  {gifts.map((g) => {
                    const isReceived = g.toUserId === user?.id;
                    return renderTransaction(
                      isReceived ? "gift-received" : "gift-sent",
                      g.id,
                      isReceived ? "Money Gift Received" : "Money Gift Sent",
                      g.amount,
                      g.createdAt,
                      isReceived ? `From ${g.sender.username}` : `To ${g.recipient.username}`
                    );
                  })}
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Gift className="h-12 w-12 mb-4 opacity-50" />
                  <p>No gifts yet</p>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

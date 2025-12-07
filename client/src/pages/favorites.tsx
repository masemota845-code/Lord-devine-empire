import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  HeartOff, 
  Star, 
  Download, 
  Eye, 
  ShoppingCart,
  ArrowDown,
  ArrowUp,
  Loader2
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { VerificationBadge } from "@/components/verification-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Favorite, MarketplaceListing, User } from "@shared/schema";

interface FavoriteWithListing extends Favorite {
  listing: MarketplaceListing & { seller: User };
}

export default function Favorites() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: favorites, isLoading } = useQuery<FavoriteWithListing[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiRequest("DELETE", `/api/favorites/${listingId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Removed from favorites" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const response = await apiRequest("POST", `/api/marketplace/purchase/${listingId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Purchase successful!", description: "The file has been added to your library." });
    },
    onError: (error) => {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    },
  });

  const getPriceChange = (current: string, saved: string) => {
    const currentPrice = parseFloat(current);
    const savedPrice = parseFloat(saved);
    const diff = currentPrice - savedPrice;
    const percentage = ((diff / savedPrice) * 100).toFixed(0);
    
    if (diff === 0) return null;
    if (diff < 0) {
      return { type: "decrease", amount: Math.abs(diff), percentage: Math.abs(parseFloat(percentage)) };
    }
    return { type: "increase", amount: diff, percentage: parseFloat(percentage) };
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-favorites-title">
          <Heart className="h-8 w-8 text-red-500" />
          Favorites
        </h1>
        <p className="text-muted-foreground">
          Your saved items from the marketplace
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : favorites && favorites.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((favorite) => {
            const priceChange = getPriceChange(favorite.listing.price, favorite.priceAtSave);
            
            return (
              <Card key={favorite.id} className="overflow-visible" data-testid={`card-favorite-${favorite.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{favorite.listing.title}</CardTitle>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <UserAvatar
                          username={favorite.listing.seller.username}
                          profileImage={favorite.listing.seller.profileImage}
                          size="sm"
                        />
                        <span className="text-sm text-muted-foreground">{favorite.listing.seller.username}</span>
                        <VerificationBadge 
                          isVerified={favorite.listing.seller.isVerified} 
                          isAdmin={favorite.listing.seller.isAdmin} 
                          size="sm" 
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFavoriteMutation.mutate(favorite.listing.id)}
                      disabled={removeFavoriteMutation.isPending}
                      data-testid={`button-remove-favorite-${favorite.id}`}
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{favorite.listing.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {parseFloat(favorite.listing.averageRating || "0").toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {favorite.listing.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {favorite.listing.views}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold">
                      ${parseFloat(favorite.listing.price).toLocaleString()}
                    </span>
                    {priceChange && (
                      <Badge 
                        variant={priceChange.type === "decrease" ? "default" : "secondary"}
                        className={priceChange.type === "decrease" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}
                      >
                        {priceChange.type === "decrease" ? (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        )}
                        {priceChange.percentage}%
                      </Badge>
                    )}
                  </div>
                  {favorite.listing.sellerId !== user?.id && (
                    <Button
                      size="sm"
                      onClick={() => purchaseMutation.mutate(favorite.listing.id)}
                      disabled={purchaseMutation.isPending}
                      data-testid={`button-purchase-${favorite.id}`}
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      )}
                      Buy
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <HeartOff className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No favorites yet</h3>
            <p className="text-sm text-center">
              Browse the marketplace and save items you like!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Search, 
  Plus, 
  Star, 
  Download, 
  Eye, 
  Heart, 
  ShoppingCart,
  Upload,
  FileCode,
  Filter,
  Loader2,
  Code,
  X
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { VerificationBadge } from "@/components/verification-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MarketplaceListing, User } from "@shared/schema";

interface ListingWithSeller extends MarketplaceListing {
  seller: User;
}

const categories = [
  "All",
  "Frontend",
  "Backend", 
  "Full Stack",
  "Mobile",
  "Scripts",
  "Templates",
  "Utilities",
  "Games",
  "Other"
];

const uploadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Price must be a valid number"),
  category: z.string().optional(),
  tags: z.string().optional(),
  version: z.string().default("1.0.0"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function Marketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithSeller | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { data: listings, isLoading } = useQuery<ListingWithSeller[]>({
    queryKey: ["/api/marketplace/listings", selectedCategory, sortBy, searchQuery],
  });

  const { data: myListings } = useQuery<ListingWithSeller[]>({
    queryKey: ["/api/marketplace/my-listings"],
    enabled: !!user,
  });

  const { data: myPurchases } = useQuery<ListingWithSeller[]>({
    queryKey: ["/api/marketplace/my-purchases"],
    enabled: !!user,
  });

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "0",
      category: "",
      tags: "",
      version: "1.0.0",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData & { fileData: string; fileName: string; fileSize: number; fileType: string }) => {
      const response = await apiRequest("POST", "/api/marketplace/listings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      toast({ title: "Success!", description: "Your listing has been created." });
      setUploadDialogOpen(false);
      form.reset();
      setUploadedFile(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const response = await apiRequest("POST", `/api/marketplace/purchase/${listingId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Purchase successful!", description: "The file has been added to your library." });
      setPreviewDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const response = await apiRequest("POST", `/api/favorites/${listingId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Added to favorites!" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const onSubmitUpload = async (data: UploadFormData) => {
    if (!uploadedFile) {
      toast({ title: "Error", description: "Please select a file to upload", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result as string;
      uploadMutation.mutate({
        ...data,
        fileData,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        fileType: uploadedFile.type || "application/octet-stream",
      });
    };
    reader.readAsDataURL(uploadedFile);
  };

  const filteredListings = listings?.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderListingCard = (listing: ListingWithSeller, showActions = true) => (
    <Card key={listing.id} className="overflow-visible hover-elevate cursor-pointer" data-testid={`card-listing-${listing.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{listing.title}</CardTitle>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <UserAvatar
                username={listing.seller.username}
                profileImage={listing.seller.profileImage}
                size="sm"
              />
              <span className="text-sm text-muted-foreground">{listing.seller.username}</span>
              <VerificationBadge isVerified={listing.seller.isVerified} isAdmin={listing.seller.isAdmin} size="sm" />
            </div>
          </div>
          {listing.category && (
            <Badge variant="secondary" className="shrink-0">{listing.category}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            {parseFloat(listing.averageRating || "0").toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {listing.downloads}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {listing.views}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-2">
        <span className="text-lg font-bold" data-testid={`text-price-${listing.id}`}>
          ${parseFloat(listing.price).toLocaleString()}
        </span>
        {showActions && (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                favoriteMutation.mutate(listing.id);
              }}
              data-testid={`button-favorite-${listing.id}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedListing(listing);
                setPreviewDialogOpen(true);
              }}
              data-testid={`button-view-${listing.id}`}
            >
              View
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-marketplace-title">Marketplace</h1>
          <p className="text-muted-foreground">Discover and sell code, scripts, and templates</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-listing">
              <Plus className="h-4 w-4 mr-2" />
              Upload Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Listing</DialogTitle>
              <DialogDescription>Upload your code to the marketplace</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitUpload)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Script" {...field} data-testid="input-listing-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your listing..." {...field} data-testid="input-listing-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} data-testid="input-listing-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-listing-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.slice(1).map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="javascript, react, utility" {...field} data-testid="input-listing-tags" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>File</FormLabel>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {uploadedFile ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-5 w-5" />
                          <span className="text-sm">{uploadedFile.name}</span>
                          <Badge variant="secondary">{(uploadedFile.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setUploadedFile(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                        <input type="file" className="hidden" onChange={handleFileUpload} data-testid="input-listing-file" />
                      </label>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-submit-listing">
                    {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Listing
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse" data-testid="tab-browse">Browse</TabsTrigger>
          <TabsTrigger value="my-listings" data-testid="tab-my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="purchases" data-testid="tab-purchases">My Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-marketplace"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px]" data-testid="select-category-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-8 w-20" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredListings && filteredListings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => renderListingCard(listing))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No listings found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-listings" className="mt-4">
          {myListings && myListings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myListings.map((listing) => renderListingCard(listing, false))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No listings yet</h3>
              <p className="text-muted-foreground mb-4">Start selling by creating your first listing</p>
              <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-create-first-listing">
                <Plus className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          {myPurchases && myPurchases.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myPurchases.map((listing) => (
                <Card key={listing.id} data-testid={`card-purchase-${listing.id}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    <CardDescription>By {listing.seller.username}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" data-testid={`button-download-${listing.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No purchases yet</h3>
              <p className="text-muted-foreground">Browse the marketplace to find useful code</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {selectedListing.title}
                  {selectedListing.category && (
                    <Badge variant="secondary">{selectedListing.category}</Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <UserAvatar
                    username={selectedListing.seller.username}
                    profileImage={selectedListing.seller.profileImage}
                    size="sm"
                  />
                  <span>{selectedListing.seller.username}</span>
                  <VerificationBadge isVerified={selectedListing.seller.isVerified} isAdmin={selectedListing.seller.isAdmin} size="sm" />
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  <p className="text-sm">{selectedListing.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {parseFloat(selectedListing.averageRating || "0").toFixed(1)} ({selectedListing.totalRatings} ratings)
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      {selectedListing.downloads} downloads
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {selectedListing.views} views
                    </span>
                  </div>

                  {selectedListing.codePreview && (
                    <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
                      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <Code className="h-4 w-4" />
                        <span>Code Preview</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{selectedListing.codePreview}</pre>
                    </div>
                  )}

                  {selectedListing.tags && (selectedListing.tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(selectedListing.tags as string[]).map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="flex-row justify-between items-center gap-2 pt-4">
                <span className="text-2xl font-bold">${parseFloat(selectedListing.price).toLocaleString()}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => favoriteMutation.mutate(selectedListing.id)}
                    data-testid="button-preview-favorite"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Favorite
                  </Button>
                  {selectedListing.sellerId !== user?.id && (
                    <Button
                      onClick={() => purchaseMutation.mutate(selectedListing.id)}
                      disabled={purchaseMutation.isPending}
                      data-testid="button-purchase"
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      )}
                      Purchase
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

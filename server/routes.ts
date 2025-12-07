import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMarketplaceListingSchema } from "@shared/schema";
import session from "express-session";
import { randomUUID } from "crypto";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

const connectedClients = new Map<string, Set<WebSocket>>();
const onlineUsers = new Map<string, { username: string; lastSeen: Date }>();

function broadcastToChat(message: any) {
  connectedClients.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'lorddevine-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));

  async function initAdminAccount() {
    const existingAdmin = await storage.getUserByUsername('lorddevine_admin');
    if (!existingAdmin) {
      const hashedPassword = hashPassword('LordDevine@2025!');
      await storage.createUser({
        username: 'lorddevine_admin',
        password: hashedPassword,
      });
      const admin = await storage.getUserByUsername('lorddevine_admin');
      if (admin) {
        await storage.updateUser(admin.id, {
          isAdmin: true,
          hasInfiniteBalance: true,
          balance: "999999999.99",
          isVerified: true,
          displayName: "Lord Devine"
        });
      }
    }
  }
  
  initAdminAccount().catch(console.error);

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = hashPassword(parsed.data.password);
      const user = await storage.createUser({
        username: parsed.data.username,
        password: hashedPassword,
      });

      // Handle referral
      if (parsed.data.referralCode) {
        const referrer = await storage.getUserByReferralCode(parsed.data.referralCode);
        if (referrer) {
          await storage.createReferral(referrer.id, user.id);
          // Give referrer bonus
          const referrerBalance = parseFloat(referrer.balance);
          await storage.updateUserBalance(referrer.id, (referrerBalance + 100).toFixed(2));
          // Give referred bonus
          const userBalance = parseFloat(user.balance);
          await storage.updateUserBalance(user.id, (userBalance + 50).toFixed(2));
          
          await storage.createNotification({
            userId: referrer.id,
            type: 'referral',
            title: 'New Referral',
            message: `${user.username} signed up using your referral code! You earned $100.`,
            data: { referredUserId: user.id }
          });
        }
      }

      // Check for first_signup achievement
      const hasAchievement = await storage.hasAchievement(user.id, 'first_signup');
      if (!hasAchievement) {
        await storage.createAchievement({ userId: user.id, type: 'first_signup' });
      }

      req.session.userId = user.id;
      const updatedUser = await storage.getUser(user.id);
      res.json({ 
        id: updatedUser!.id, 
        username: updatedUser!.username, 
        balance: updatedUser!.balance,
        isAdmin: updatedUser!.isAdmin,
        hasInfiniteBalance: updatedUser!.hasInfiniteBalance,
        isVerified: updatedUser!.isVerified,
        profileImage: updatedUser!.profileImage,
        referralCode: updatedUser!.referralCode
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.isSuspended) {
        return res.status(403).json({ message: "Your account has been suspended" });
      }

      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ 
        id: user.id, 
        username: user.username, 
        balance: user.balance,
        isAdmin: user.isAdmin,
        hasInfiniteBalance: user.hasInfiniteBalance,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        displayName: user.displayName,
        referralCode: user.referralCode,
        theme: user.theme
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const userId = req.session.userId;
    if (userId) {
      onlineUsers.delete(userId);
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    res.json({ 
      id: user.id, 
      username: user.username, 
      balance: user.balance,
      isAdmin: user.isAdmin,
      hasInfiniteBalance: user.hasInfiniteBalance,
      isVerified: user.isVerified,
      profileImage: user.profileImage,
      displayName: user.displayName,
      bio: user.bio,
      referralCode: user.referralCode,
      theme: user.theme,
      totalEarnings: user.totalEarnings,
      createdAt: user.createdAt
    });
  });

  // Profile routes
  app.get('/api/profile', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const achievements = await storage.getUserAchievements(user.id);
      const listings = await storage.getUserListings(user.id);
      const purchases = await storage.getUserPurchases(user.id);
      const referralCount = await storage.getReferralCount(user.id);

      res.json({
        user: { ...user, password: undefined },
        achievements,
        listingCount: listings.length,
        purchaseCount: purchases.length,
        referralCount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get('/api/profile/:username', async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const achievements = await storage.getUserAchievements(user.id);
      const listings = await storage.getUserListings(user.id);

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        achievements,
        listings: listings.filter(l => l.isActive),
        createdAt: user.createdAt
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', requireAuth, async (req, res) => {
    try {
      const { displayName, bio, theme } = req.body;
      const user = await storage.updateUser(req.session.userId!, { 
        displayName, 
        bio,
        theme 
      });
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch('/api/profile/image', requireAuth, async (req, res) => {
    try {
      const { imageData } = req.body;
      const user = await storage.updateUserProfileImage(req.session.userId!, imageData);
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });

  app.patch('/api/profile/password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedCurrent = hashPassword(currentPassword);
      if (user.password !== hashedCurrent) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character" });
      }

      const hashedNew = hashPassword(newPassword);
      await storage.updateUserPassword(req.session.userId!, hashedNew);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const listings = await storage.getUserListings(req.session.userId!);
      const purchases = await storage.getUserPurchases(req.session.userId!);
      const sales = await storage.getUserSales(req.session.userId!);
      const favorites = await storage.getUserFavorites(req.session.userId!);
      const unreadNotifications = await storage.getUnreadNotificationCount(req.session.userId!);

      const totalViews = listings.reduce((sum, l) => sum + l.views, 0);
      const totalDownloads = listings.reduce((sum, l) => sum + l.downloads, 0);
      const totalSalesAmount = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);

      res.json({
        balance: user.balance,
        totalEarnings: user.totalEarnings,
        listingCount: listings.filter(l => l.isActive).length,
        purchaseCount: purchases.length,
        saleCount: sales.length,
        favoriteCount: favorites.length,
        totalViews,
        totalDownloads,
        totalSalesAmount: totalSalesAmount.toFixed(2),
        unreadNotifications
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Marketplace routes
  app.get('/api/marketplace', async (req, res) => {
    try {
      const listings = await storage.getAllListings();
      const listingsWithSeller = await Promise.all(
        listings.map(async (listing) => {
          const seller = await storage.getUser(listing.sellerId);
          return {
            ...listing,
            sellerName: seller?.username || 'Unknown',
            sellerVerified: seller?.isVerified || false,
            sellerAdmin: seller?.isAdmin || false
          };
        })
      );
      res.json(listingsWithSeller);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get('/api/marketplace/:id', async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      await storage.incrementListingViews(req.params.id);
      const seller = await storage.getUser(listing.sellerId);
      const ratings = await storage.getListingRatings(listing.id);
      
      const ratingsWithUser = await Promise.all(
        ratings.map(async (r) => {
          const user = await storage.getUser(r.userId);
          return { ...r, username: user?.username || 'Unknown' };
        })
      );

      res.json({ 
        ...listing, 
        sellerName: seller?.username || 'Unknown',
        sellerVerified: seller?.isVerified || false,
        sellerAdmin: seller?.isAdmin || false,
        ratings: ratingsWithUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.post('/api/marketplace', requireAuth, async (req, res) => {
    try {
      const { title, description, price, fileName, fileSize, fileType, fileData, codePreview, previewImages, category, tags, version } = req.body;
      
      const listing = await storage.createListing(req.session.userId!, {
        title,
        description,
        price,
        fileName,
        fileSize,
        fileType,
        fileData,
        codePreview,
        previewImages: previewImages || [],
        category: category || 'General',
        tags: tags || [],
        version: version || '1.0.0'
      });
      
      // Check for first_upload achievement
      const hasAchievement = await storage.hasAchievement(req.session.userId!, 'first_upload');
      if (!hasAchievement) {
        await storage.createAchievement({ userId: req.session.userId!, type: 'first_upload' });
      }

      res.json(listing);
    } catch (error) {
      console.error('Create listing error:', error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.post('/api/marketplace/:id/purchase', requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      const buyer = await storage.getUser(req.session.userId!);
      if (!buyer) {
        return res.status(404).json({ message: "User not found" });
      }

      const alreadyPurchased = await storage.hasPurchased(req.session.userId!, req.params.id);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "You already own this file" });
      }

      if (listing.sellerId === req.session.userId) {
        return res.status(400).json({ message: "You cannot buy your own listing" });
      }

      const price = parseFloat(listing.price);
      const buyerBalance = parseFloat(buyer.balance);

      if (!buyer.hasInfiniteBalance && buyerBalance < price) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      if (!buyer.hasInfiniteBalance) {
        await storage.updateUserBalance(buyer.id, (buyerBalance - price).toFixed(2));
      }

      const seller = await storage.getUser(listing.sellerId);
      if (seller && !seller.hasInfiniteBalance) {
        const sellerBalance = parseFloat(seller.balance);
        const sellerEarnings = parseFloat(seller.totalEarnings);
        await storage.updateUserBalance(seller.id, (sellerBalance + price).toFixed(2));
        await storage.updateUser(seller.id, { totalEarnings: (sellerEarnings + price).toFixed(2) });
      }

      const purchase = await storage.createPurchase({
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        listingId: listing.id,
        amount: listing.price,
        platformFee: "0.00"
      });

      await storage.incrementListingDownloads(listing.id);

      // Create notifications
      await storage.createNotification({
        userId: buyer.id,
        type: 'purchase',
        title: 'Purchase Complete',
        message: `You purchased "${listing.title}" for $${listing.price}`,
        data: { listingId: listing.id, purchaseId: purchase.id }
      });

      await storage.createNotification({
        userId: listing.sellerId,
        type: 'sale',
        title: 'New Sale',
        message: `${buyer.username} purchased "${listing.title}" for $${listing.price}`,
        data: { listingId: listing.id, purchaseId: purchase.id, buyerId: buyer.id }
      });

      // Check for first_purchase achievement
      const hasAchievement = await storage.hasAchievement(buyer.id, 'first_purchase');
      if (!hasAchievement) {
        await storage.createAchievement({ userId: buyer.id, type: 'first_purchase' });
      }

      res.json({ purchase, fileData: listing.fileData, fileName: listing.fileName });
    } catch (error) {
      console.error('Purchase error:', error);
      res.status(500).json({ message: "Failed to complete purchase" });
    }
  });

  app.get('/api/marketplace/:id/download', requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      const hasPurchased = await storage.hasPurchased(req.session.userId!, req.params.id);
      const isSeller = listing.sellerId === req.session.userId;
      const user = await storage.getUser(req.session.userId!);
      
      if (!hasPurchased && !isSeller && !user?.isAdmin) {
        return res.status(403).json({ message: "You must purchase this file first" });
      }

      res.json({ fileData: listing.fileData, fileName: listing.fileName });
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete('/api/marketplace/:id', requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (listing.sellerId !== req.session.userId && !user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.deleteListing(req.params.id);
      res.json({ message: "Listing deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete listing" });
    }
  });

  // Ratings
  app.post('/api/marketplace/:id/rate', requireAuth, async (req, res) => {
    try {
      const { rating, review } = req.body;
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      const hasPurchased = await storage.hasPurchased(req.session.userId!, req.params.id);
      if (!hasPurchased) {
        return res.status(403).json({ message: "You must purchase this item to rate it" });
      }

      const existingRating = await storage.getUserRating(req.session.userId!, req.params.id);
      if (existingRating) {
        await storage.updateRating(existingRating.id, rating, review);
      } else {
        await storage.createRating({
          userId: req.session.userId!,
          listingId: req.params.id,
          rating,
          review
        });
      }

      // Recalculate average rating
      const allRatings = await storage.getListingRatings(req.params.id);
      const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      await storage.updateListingRating(req.params.id, avgRating.toFixed(2), allRatings.length);

      res.json({ message: "Rating submitted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit rating" });
    }
  });

  // User listings and purchases
  app.get('/api/my/listings', requireAuth, async (req, res) => {
    try {
      const listings = await storage.getUserListings(req.session.userId!);
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get('/api/my/purchases', requireAuth, async (req, res) => {
    try {
      const purchases = await storage.getUserPurchases(req.session.userId!);
      const purchasesWithDetails = await Promise.all(
        purchases.map(async (purchase) => {
          const listing = await storage.getListing(purchase.listingId);
          const seller = await storage.getUser(purchase.sellerId);
          return { ...purchase, listing, sellerName: seller?.username || 'Unknown' };
        })
      );
      res.json(purchasesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.get('/api/my/sales', requireAuth, async (req, res) => {
    try {
      const sales = await storage.getUserSales(req.session.userId!);
      const salesWithDetails = await Promise.all(
        sales.map(async (sale) => {
          const listing = await storage.getListing(sale.listingId);
          const buyer = await storage.getUser(sale.buyerId);
          return { ...sale, listing, buyerName: buyer?.username || 'Unknown' };
        })
      );
      res.json(salesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  // Favorites
  app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
      const favorites = await storage.getUserFavorites(req.session.userId!);
      const favoritesWithListings = await Promise.all(
        favorites.map(async (fav) => {
          const listing = await storage.getListing(fav.listingId);
          if (!listing) return null;
          const seller = await storage.getUser(listing.sellerId);
          const priceDrop = parseFloat(fav.priceAtSave) > parseFloat(listing.price);
          return { 
            ...fav, 
            listing,
            sellerName: seller?.username || 'Unknown',
            currentPrice: listing.price,
            priceDrop
          };
        })
      );
      res.json(favoritesWithListings.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites/:listingId', requireAuth, async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      const exists = await storage.isFavorite(req.session.userId!, req.params.listingId);
      if (exists) {
        return res.status(400).json({ message: "Already in favorites" });
      }

      const favorite = await storage.addFavorite(
        req.session.userId!,
        req.params.listingId,
        listing.price
      );
      res.json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete('/api/favorites/:listingId', requireAuth, async (req, res) => {
    try {
      await storage.removeFavorite(req.session.userId!, req.params.listingId);
      res.json({ message: "Removed from favorites" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  app.get('/api/favorites/:listingId/check', requireAuth, async (req, res) => {
    try {
      const isFav = await storage.isFavorite(req.session.userId!, req.params.listingId);
      res.json({ isFavorite: isFav });
    } catch (error) {
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Notifications
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.session.userId!);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "Marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete('/api/notifications', requireAuth, async (req, res) => {
    try {
      await storage.deleteAllNotifications(req.session.userId!);
      res.json({ message: "All notifications deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notifications" });
    }
  });

  // Personal files
  app.get('/api/files', requireAuth, async (req, res) => {
    try {
      const files = await storage.getUserPersonalFiles(req.session.userId!);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post('/api/files', requireAuth, async (req, res) => {
    try {
      const { fileName, fileSize, fileType, fileData } = req.body;
      const file = await storage.createPersonalFile(req.session.userId!, {
        fileName,
        fileSize,
        fileType,
        fileData,
      });
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get('/api/files/:id/download', requireAuth, async (req, res) => {
    try {
      const file = await storage.getPersonalFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      if (file.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json({ fileData: file.fileData, fileName: file.fileName });
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete('/api/files/:id', requireAuth, async (req, res) => {
    try {
      const file = await storage.getPersonalFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      if (file.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deletePersonalFile(req.params.id);
      res.json({ message: "File deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string | undefined;
      const messages = await storage.getChatMessages(limit, before);
      
      const messagesWithUser = await Promise.all(
        messages.map(async (msg) => {
          const user = await storage.getUser(msg.userId);
          return {
            ...msg,
            username: user?.username || 'Unknown',
            userVerified: user?.isVerified || false,
            userAdmin: user?.isAdmin || false,
            profileImage: user?.profileImage
          };
        })
      );
      
      res.json(messagesWithUser.reverse());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chat/messages', requireAuth, async (req, res) => {
    try {
      const { content, mentions } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      const message = await storage.createChatMessage({
        userId: req.session.userId!,
        content: content.trim(),
        mentions: mentions || []
      });

      const user = await storage.getUser(req.session.userId!);
      const fullMessage = {
        ...message,
        username: user?.username || 'Unknown',
        userVerified: user?.isVerified || false,
        userAdmin: user?.isAdmin || false,
        profileImage: user?.profileImage
      };

      broadcastToChat({ type: 'new_message', message: fullMessage });

      // Check for community champion achievement
      const messages = await storage.getChatMessages(100);
      const userMessages = messages.filter(m => m.userId === req.session.userId);
      if (userMessages.length >= 50) {
        const hasAchievement = await storage.hasAchievement(req.session.userId!, 'community_champion');
        if (!hasAchievement) {
          await storage.createAchievement({ userId: req.session.userId!, type: 'community_champion' });
        }
      }

      res.json(fullMessage);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/chat/pinned', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getPinnedMessages();
      const messagesWithUser = await Promise.all(
        messages.map(async (msg) => {
          const user = await storage.getUser(msg.userId);
          return {
            ...msg,
            username: user?.username || 'Unknown',
            userVerified: user?.isVerified || false,
            userAdmin: user?.isAdmin || false
          };
        })
      );
      res.json(messagesWithUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pinned messages" });
    }
  });

  app.post('/api/chat/messages/:id/pin', requireAdmin, async (req, res) => {
    try {
      const { isPinned } = req.body;
      await storage.pinChatMessage(req.params.id, isPinned);
      broadcastToChat({ type: 'message_pinned', messageId: req.params.id, isPinned });
      res.json({ message: isPinned ? "Message pinned" : "Message unpinned" });
    } catch (error) {
      res.status(500).json({ message: "Failed to pin/unpin message" });
    }
  });

  app.delete('/api/chat/messages/:id', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      // Only admin can delete messages
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Only admins can delete messages" });
      }
      await storage.deleteChatMessage(req.params.id);
      broadcastToChat({ type: 'message_deleted', messageId: req.params.id });
      res.json({ message: "Message deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.get('/api/chat/online', requireAuth, async (req, res) => {
    try {
      const onlineList = Array.from(onlineUsers.entries()).map(([id, data]) => ({
        id,
        username: data.username,
        lastSeen: data.lastSeen
      }));
      res.json(onlineList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });

  app.post('/api/chat/heartbeat', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user) {
        onlineUsers.set(user.id, { username: user.username, lastSeen: new Date() });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update heartbeat" });
    }
  });

  // AI routes
  app.get('/api/ai/conversations', requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getUserAiConversations(req.session.userId!);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/ai/conversations', requireAuth, async (req, res) => {
    try {
      const { title } = req.body;
      const conversation = await storage.createAiConversation(
        req.session.userId!,
        title || "New Conversation"
      );
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/ai/conversations/:id', requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getAiConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const messages = await storage.getAiMessages(req.params.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch('/api/ai/conversations/:id', requireAuth, async (req, res) => {
    try {
      const { title } = req.body;
      const conversation = await storage.getAiConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.updateAiConversationTitle(req.params.id, title);
      res.json({ message: "Title updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete('/api/ai/conversations/:id', requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getAiConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteAiConversation(req.params.id);
      res.json({ message: "Conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.post('/api/ai/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      const { content, attachments } = req.body;
      const conversation = await storage.getAiConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Save user message
      const userMessage = await storage.createAiMessage({
        conversationId: req.params.id,
        role: 'user',
        content,
        attachments: attachments || []
      });

      // Get all messages for context
      const allMessages = await storage.getAiMessages(req.params.id);
      
      // Call Groq API
      const groqApiKey = process.env.GROQ_API_KEY;
      let aiResponse = "I'm sorry, but I cannot process your request at this time. The AI service is not configured. Please add your GROQ_API_KEY (free at console.groq.com) to enable AI features.";

      if (groqApiKey && groqApiKey.trim().length > 0) {
        try {
          const messagesForApi = allMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }));

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.1-70b-versatile',
              messages: [
                { 
                  role: 'system', 
                  content: 'You are Axel Codex, an advanced AI coding assistant created by Lord Devine for the Developer Empire platform. You are an expert in all programming languages, frameworks, and development tools. You help developers with code analysis, debugging, optimization, and generating high-quality code. Be helpful, precise, and provide detailed explanations when needed. Format code properly with markdown code blocks.' 
                },
                ...messagesForApi
              ],
              temperature: 0.7,
              max_tokens: 4096
            })
          });

          if (response.ok) {
            const data = await response.json();
            aiResponse = data.choices[0]?.message?.content || "I couldn't generate a response.";
          }
        } catch (apiError) {
          console.error('Groq API error:', apiError);
        }
      }

      // Save AI response
      const assistantMessage = await storage.createAiMessage({
        conversationId: req.params.id,
        role: 'assistant',
        content: aiResponse
      });

      // Update conversation title if it's the first message
      if (allMessages.length === 1) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await storage.updateAiConversationTitle(req.params.id, title);
      }

      res.json({ userMessage, assistantMessage });
    } catch (error) {
      console.error('AI message error:', error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Code Studio routes
  app.post('/api/ai/analyze', requireAuth, async (req, res) => {
    try {
      const { code, language } = req.body;
      
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert code analyzer. Analyze the provided code and return a detailed analysis including: code quality (score out of 100), potential bugs, security issues, performance optimizations, and best practice suggestions. Format your response clearly with sections.'
            },
            { 
              role: 'user', 
              content: `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` 
            }
          ],
          temperature: 0.3,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        throw new Error('AI API request failed');
      }

      const data = await response.json();
      res.json({ analysis: data.choices[0]?.message?.content });
    } catch (error) {
      console.error('Code analysis error:', error);
      res.status(500).json({ message: "Failed to analyze code" });
    }
  });

  app.post('/api/ai/generate', requireAuth, async (req, res) => {
    try {
      const { prompt, language } = req.body;
      
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert ${language} developer. Generate clean, well-documented, production-ready code based on the user's requirements. Include comments explaining complex logic. Return ONLY the code, wrapped in markdown code blocks.`
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ],
          temperature: 0.5,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        throw new Error('AI API request failed');
      }

      const data = await response.json();
      res.json({ code: data.choices[0]?.message?.content });
    } catch (error) {
      console.error('Code generation error:', error);
      res.status(500).json({ message: "Failed to generate code" });
    }
  });

  // Verification routes
  app.post('/api/verification/purchase', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "You are already verified" });
      }

      const balance = parseFloat(user.balance);
      const verificationCost = 5000;

      if (!user.hasInfiniteBalance && balance < verificationCost) {
        return res.status(400).json({ message: "Insufficient balance. Verification costs $5,000/month." });
      }

      if (!user.hasInfiniteBalance) {
        await storage.updateUserBalance(user.id, (balance - verificationCost).toFixed(2));
      }

      const payment = await storage.createVerificationPayment(user.id);

      await storage.createNotification({
        userId: user.id,
        type: 'system',
        title: 'Verification Active',
        message: 'Congratulations! You are now a verified member of the Developer Empire.',
        data: { paymentId: payment.id }
      });

      res.json({ message: "Verification successful", payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to process verification" });
    }
  });

  app.get('/api/verification/status', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activePayment = await storage.getActiveVerification(req.session.userId!);
      
      res.json({
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt,
        verificationExpiry: user.verificationExpiry,
        grantedByAdmin: !!user.verificationGrantedBy,
        activePayment
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  // Achievements
  app.get('/api/achievements', requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getUserAchievements(req.session.userId!);
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Referrals
  app.get('/api/referrals', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const referrals = await storage.getUserReferrals(req.session.userId!);
      
      const referralsWithUser = await Promise.all(
        referrals.map(async (r) => {
          const referred = await storage.getUser(r.referredId);
          return { ...r, referredUsername: referred?.username || 'Unknown' };
        })
      );

      res.json({
        referralCode: user?.referralCode,
        referrals: referralsWithUser,
        totalEarned: referrals.reduce((sum, r) => sum + parseFloat(r.referrerBonus), 0)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // User search
  app.get('/api/users/search', requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query);
      res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        profileImage: u.profileImage,
        isVerified: u.isVerified,
        isAdmin: u.isAdmin
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const listings = await storage.getAllListings();
      const allPurchases = await storage.getAllPurchases();
      
      const totalVolume = allPurchases.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const verifiedUsers = users.filter(u => u.isVerified).length;
      
      res.json({
        totalUsers: users.length,
        verifiedUsers,
        totalListings: listings.length,
        totalPurchases: allPurchases.length,
        totalVolume: totalVolume.toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post('/api/admin/gift-money', requireAdmin, async (req, res) => {
    try {
      const { userId, amount, note } = req.body;
      
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid user or amount" });
      }

      const recipient = await storage.getUser(userId);
      if (!recipient) {
        return res.status(404).json({ message: "User not found" });
      }

      const admin = await storage.getUser(req.session.userId!);
      
      if (!recipient.hasInfiniteBalance) {
        const newBalance = parseFloat(recipient.balance) + amount;
        await storage.updateUserBalance(userId, newBalance.toFixed(2));
      }

      const gift = await storage.createMoneyGift({
        fromUserId: req.session.userId!,
        toUserId: userId,
        amount: amount.toFixed(2),
        note
      });

      await storage.createNotification({
        userId: userId,
        type: 'gift',
        title: 'Money Gift Received',
        message: `${admin?.username || 'Admin'} sent you $${amount.toFixed(2)}${note ? `: "${note}"` : ''}`,
        data: { giftId: gift.id, amount }
      });

      res.json({ message: "Gift sent successfully", gift });
    } catch (error) {
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  app.post('/api/admin/toggle-verification/:userId', requireAdmin, async (req, res) => {
    try {
      const { isVerified } = req.body;
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(req.params.userId, {
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        verificationGrantedBy: isVerified ? req.session.userId : null,
        verificationExpiry: null // Admin grants don't expire
      });

      await storage.createNotification({
        userId: req.params.userId,
        type: 'system',
        title: isVerified ? 'Verification Granted' : 'Verification Removed',
        message: isVerified 
          ? 'An admin has granted you permanent verification status.'
          : 'Your verification status has been removed by an admin.',
        data: {}
      });

      res.json({ message: `Verification ${isVerified ? 'granted' : 'removed'}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle verification" });
    }
  });

  app.post('/api/admin/toggle-suspend/:userId', requireAdmin, async (req, res) => {
    try {
      const { isSuspended } = req.body;
      const user = await storage.getUser(req.params.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isAdmin) {
        return res.status(400).json({ message: "Cannot suspend an admin" });
      }

      await storage.updateUser(req.params.userId, { isSuspended });

      res.json({ message: `User ${isSuspended ? 'suspended' : 'unsuspended'}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle suspension" });
    }
  });

  // WebSocket setup for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let userId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          userId = message.userId;
          if (userId) {
            if (!connectedClients.has(userId)) {
              connectedClients.set(userId, new Set());
            }
            connectedClients.get(userId)!.add(ws);
            
            const user = await storage.getUser(userId);
            if (user) {
              onlineUsers.set(userId, { username: user.username, lastSeen: new Date() });
              broadcastToChat({ type: 'user_online', userId, username: user.username });
            }
          }
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    });

    ws.on('close', () => {
      if (userId) {
        const userSockets = connectedClients.get(userId);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            connectedClients.delete(userId);
            const userData = onlineUsers.get(userId);
            onlineUsers.delete(userId);
            if (userData) {
              broadcastToChat({ type: 'user_offline', userId, username: userData.username });
            }
          }
        }
      }
    });
  });

  // Clean up old online users periodically
  setInterval(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    onlineUsers.forEach((data, id) => {
      if (data.lastSeen < fiveMinutesAgo) {
        onlineUsers.delete(id);
      }
    });
  }, 60000);

  // Check verification expirations periodically
  setInterval(() => {
    storage.checkAndExpireVerifications().catch(console.error);
  }, 60 * 60 * 1000); // Every hour

  return httpServer;
}

import { 
  type User, type InsertUser, 
  type MarketplaceListing, type InsertMarketplaceListing,
  type Purchase, type InsertPurchase,
  type PersonalFile, type InsertPersonalFile,
  type Notification, type InsertNotification,
  type Favorite, type InsertFavorite,
  type ChatMessage, type InsertChatMessage,
  type AiConversation, type InsertAiConversation,
  type AiMessage, type InsertAiMessage,
  type Achievement, type InsertAchievement,
  type MoneyGift, type InsertMoneyGift,
  type Rating, type InsertRating,
  type Referral, type VerificationPayment,
  users, marketplaceListings, purchases, personalFiles,
  notifications, favorites, chatMessages, aiConversations, aiMessages,
  achievements, moneyGifts, ratings, referrals, verificationPayments
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ne, gt, lt, ilike, or } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  updateUserBalance(id: string, newBalance: string): Promise<User | undefined>;
  updateUserProfileImage(id: string, imageUrl: string): Promise<User | undefined>;
  updateUserPassword(id: string, newPassword: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;

  // Marketplace
  createListing(sellerId: string, listing: Omit<InsertMarketplaceListing, 'sellerId'>): Promise<MarketplaceListing>;
  getListing(id: string): Promise<MarketplaceListing | undefined>;
  getAllListings(): Promise<MarketplaceListing[]>;
  getUserListings(userId: string): Promise<MarketplaceListing[]>;
  incrementListingViews(id: string): Promise<void>;
  incrementListingDownloads(id: string): Promise<void>;
  updateListingRating(id: string, avgRating: string, totalRatings: number): Promise<void>;
  deleteListing(id: string): Promise<void>;

  // Purchases
  createPurchase(purchase: Omit<InsertPurchase, 'transactionId'>): Promise<Purchase>;
  getUserPurchases(userId: string): Promise<Purchase[]>;
  getUserSales(userId: string): Promise<Purchase[]>;
  hasPurchased(userId: string, listingId: string): Promise<boolean>;
  getAllPurchases(): Promise<Purchase[]>;

  // Personal Files
  createPersonalFile(userId: string, file: InsertPersonalFile): Promise<PersonalFile>;
  getUserPersonalFiles(userId: string): Promise<PersonalFile[]>;
  getPersonalFile(id: string): Promise<PersonalFile | undefined>;
  deletePersonalFile(id: string): Promise<void>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  deleteAllNotifications(userId: string): Promise<void>;

  // Favorites
  addFavorite(userId: string, listingId: string, priceAtSave: string): Promise<Favorite>;
  removeFavorite(userId: string, listingId: string): Promise<void>;
  getUserFavorites(userId: string): Promise<Favorite[]>;
  isFavorite(userId: string, listingId: string): Promise<boolean>;

  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(limit?: number, before?: string): Promise<ChatMessage[]>;
  pinChatMessage(id: string, isPinned: boolean): Promise<void>;
  deleteChatMessage(id: string): Promise<void>;
  getPinnedMessages(): Promise<ChatMessage[]>;

  // AI Conversations
  createAiConversation(userId: string, title?: string): Promise<AiConversation>;
  getUserAiConversations(userId: string): Promise<AiConversation[]>;
  getAiConversation(id: string): Promise<AiConversation | undefined>;
  updateAiConversationTitle(id: string, title: string): Promise<void>;
  deleteAiConversation(id: string): Promise<void>;

  // AI Messages
  createAiMessage(message: InsertAiMessage): Promise<AiMessage>;
  getAiMessages(conversationId: string): Promise<AiMessage[]>;

  // Achievements
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
  hasAchievement(userId: string, type: string): Promise<boolean>;

  // Money Gifts
  createMoneyGift(gift: InsertMoneyGift): Promise<MoneyGift>;
  getUserReceivedGifts(userId: string): Promise<MoneyGift[]>;
  getUserSentGifts(userId: string): Promise<MoneyGift[]>;

  // Ratings
  createRating(rating: InsertRating): Promise<Rating>;
  getListingRatings(listingId: string): Promise<Rating[]>;
  getUserRating(userId: string, listingId: string): Promise<Rating | undefined>;
  updateRating(id: string, rating: number, review?: string): Promise<Rating | undefined>;

  // Referrals
  createReferral(referrerId: string, referredId: string): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getReferralCount(userId: string): Promise<number>;

  // Verification Payments
  createVerificationPayment(userId: string): Promise<VerificationPayment>;
  getActiveVerification(userId: string): Promise<VerificationPayment | undefined>;
  checkAndExpireVerifications(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const referralCode = `REF${randomUUID().slice(0, 8).toUpperCase()}`;
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, referralCode })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserBalance(id: string, newBalance: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserProfileImage(id: string, imageUrl: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ profileImage: imageUrl })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async searchUsers(query: string): Promise<User[]> {
    return db.select().from(users)
      .where(ilike(users.username, `%${query}%`))
      .orderBy(users.username)
      .limit(10);
  }

  // Marketplace
  async createListing(sellerId: string, listing: Omit<InsertMarketplaceListing, 'sellerId'>): Promise<MarketplaceListing> {
    const [newListing] = await db
      .insert(marketplaceListings)
      .values({ ...listing, sellerId } as any)
      .returning();
    return newListing;
  }

  async getListing(id: string): Promise<MarketplaceListing | undefined> {
    const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
    return listing || undefined;
  }

  async getAllListings(): Promise<MarketplaceListing[]> {
    return db.select().from(marketplaceListings)
      .where(eq(marketplaceListings.isActive, true))
      .orderBy(desc(marketplaceListings.createdAt));
  }

  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    return db.select().from(marketplaceListings)
      .where(eq(marketplaceListings.sellerId, userId))
      .orderBy(desc(marketplaceListings.createdAt));
  }

  async incrementListingViews(id: string): Promise<void> {
    await db.update(marketplaceListings)
      .set({ views: sql`${marketplaceListings.views} + 1` })
      .where(eq(marketplaceListings.id, id));
  }

  async incrementListingDownloads(id: string): Promise<void> {
    await db.update(marketplaceListings)
      .set({ downloads: sql`${marketplaceListings.downloads} + 1` })
      .where(eq(marketplaceListings.id, id));
  }

  async updateListingRating(id: string, avgRating: string, totalRatings: number): Promise<void> {
    await db.update(marketplaceListings)
      .set({ averageRating: avgRating, totalRatings })
      .where(eq(marketplaceListings.id, id));
  }

  async deleteListing(id: string): Promise<void> {
    await db.update(marketplaceListings)
      .set({ isActive: false })
      .where(eq(marketplaceListings.id, id));
  }

  // Purchases
  async createPurchase(purchase: Omit<InsertPurchase, 'transactionId'>): Promise<Purchase> {
    const transactionId = `TXN${Date.now()}${randomUUID().slice(0, 8).toUpperCase()}`;
    const [newPurchase] = await db
      .insert(purchases)
      .values({ ...purchase, transactionId } as any)
      .returning();
    return newPurchase;
  }

  async getUserPurchases(userId: string): Promise<Purchase[]> {
    return db.select().from(purchases)
      .where(eq(purchases.buyerId, userId))
      .orderBy(desc(purchases.createdAt));
  }

  async getUserSales(userId: string): Promise<Purchase[]> {
    return db.select().from(purchases)
      .where(eq(purchases.sellerId, userId))
      .orderBy(desc(purchases.createdAt));
  }

  async hasPurchased(userId: string, listingId: string): Promise<boolean> {
    const [purchase] = await db.select().from(purchases)
      .where(and(eq(purchases.buyerId, userId), eq(purchases.listingId, listingId)));
    return !!purchase;
  }

  async getAllPurchases(): Promise<Purchase[]> {
    return db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  // Personal Files
  async createPersonalFile(userId: string, file: InsertPersonalFile): Promise<PersonalFile> {
    const [newFile] = await db
      .insert(personalFiles)
      .values({ ...file, userId })
      .returning();
    return newFile;
  }

  async getUserPersonalFiles(userId: string): Promise<PersonalFile[]> {
    return db.select().from(personalFiles)
      .where(eq(personalFiles.userId, userId))
      .orderBy(desc(personalFiles.createdAt));
  }

  async getPersonalFile(id: string): Promise<PersonalFile | undefined> {
    const [file] = await db.select().from(personalFiles).where(eq(personalFiles.id, id));
    return file || undefined;
  }

  async deletePersonalFile(id: string): Promise<void> {
    await db.delete(personalFiles).where(eq(personalFiles.id, id));
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count) || 0;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.userId, userId));
  }

  // Favorites
  async addFavorite(userId: string, listingId: string, priceAtSave: string): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values({ userId, listingId, priceAtSave })
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, listingId: string): Promise<void> {
    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async isFavorite(userId: string, listingId: string): Promise<boolean> {
    const [favorite] = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
    return !!favorite;
  }

  // Chat Messages
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getChatMessages(limit: number = 50, before?: string): Promise<ChatMessage[]> {
    if (before) {
      return db.select().from(chatMessages)
        .where(and(eq(chatMessages.isDeleted, false), lt(chatMessages.id, before)))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
    }
    return db.select().from(chatMessages)
      .where(eq(chatMessages.isDeleted, false))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async pinChatMessage(id: string, isPinned: boolean): Promise<void> {
    await db.update(chatMessages)
      .set({ isPinned })
      .where(eq(chatMessages.id, id));
  }

  async deleteChatMessage(id: string): Promise<void> {
    await db.update(chatMessages)
      .set({ isDeleted: true })
      .where(eq(chatMessages.id, id));
  }

  async getPinnedMessages(): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(and(eq(chatMessages.isPinned, true), eq(chatMessages.isDeleted, false)))
      .orderBy(desc(chatMessages.createdAt));
  }

  // AI Conversations
  async createAiConversation(userId: string, title: string = "New Conversation"): Promise<AiConversation> {
    const [conversation] = await db
      .insert(aiConversations)
      .values({ userId, title })
      .returning();
    return conversation;
  }

  async getUserAiConversations(userId: string): Promise<AiConversation[]> {
    return db.select().from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt));
  }

  async getAiConversation(id: string): Promise<AiConversation | undefined> {
    const [conversation] = await db.select().from(aiConversations)
      .where(eq(aiConversations.id, id));
    return conversation || undefined;
  }

  async updateAiConversationTitle(id: string, title: string): Promise<void> {
    await db.update(aiConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiConversations.id, id));
  }

  async deleteAiConversation(id: string): Promise<void> {
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, id));
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
  }

  // AI Messages
  async createAiMessage(message: InsertAiMessage): Promise<AiMessage> {
    const [newMessage] = await db
      .insert(aiMessages)
      .values(message)
      .returning();
    await db.update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, message.conversationId));
    return newMessage;
  }

  async getAiMessages(conversationId: string): Promise<AiMessage[]> {
    return db.select().from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt);
  }

  // Achievements
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return db.select().from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.earnedAt));
  }

  async hasAchievement(userId: string, type: string): Promise<boolean> {
    const [achievement] = await db.select().from(achievements)
      .where(and(eq(achievements.userId, userId), eq(achievements.type, type)));
    return !!achievement;
  }

  // Money Gifts
  async createMoneyGift(gift: InsertMoneyGift): Promise<MoneyGift> {
    const [newGift] = await db
      .insert(moneyGifts)
      .values(gift)
      .returning();
    return newGift;
  }

  async getUserReceivedGifts(userId: string): Promise<MoneyGift[]> {
    return db.select().from(moneyGifts)
      .where(eq(moneyGifts.toUserId, userId))
      .orderBy(desc(moneyGifts.createdAt));
  }

  async getUserSentGifts(userId: string): Promise<MoneyGift[]> {
    return db.select().from(moneyGifts)
      .where(eq(moneyGifts.fromUserId, userId))
      .orderBy(desc(moneyGifts.createdAt));
  }

  // Ratings
  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await db
      .insert(ratings)
      .values(rating)
      .returning();
    return newRating;
  }

  async getListingRatings(listingId: string): Promise<Rating[]> {
    return db.select().from(ratings)
      .where(eq(ratings.listingId, listingId))
      .orderBy(desc(ratings.createdAt));
  }

  async getUserRating(userId: string, listingId: string): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.listingId, listingId)));
    return rating || undefined;
  }

  async updateRating(id: string, ratingValue: number, review?: string): Promise<Rating | undefined> {
    const [updated] = await db.update(ratings)
      .set({ rating: ratingValue, review })
      .where(eq(ratings.id, id))
      .returning();
    return updated || undefined;
  }

  // Referrals
  async createReferral(referrerId: string, referredId: string): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values({ referrerId, referredId })
      .returning();
    return referral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return db.select().from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    return Number(result[0]?.count) || 0;
  }

  // Verification Payments
  async createVerificationPayment(userId: string): Promise<VerificationPayment> {
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [payment] = await db
      .insert(verificationPayments)
      .values({
        userId,
        periodStart,
        periodEnd,
        amount: "5000.00",
        status: "active"
      })
      .returning();

    await db.update(users)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        verificationExpiry: periodEnd
      })
      .where(eq(users.id, userId));

    return payment;
  }

  async getActiveVerification(userId: string): Promise<VerificationPayment | undefined> {
    const [payment] = await db.select().from(verificationPayments)
      .where(and(
        eq(verificationPayments.userId, userId),
        eq(verificationPayments.status, "active"),
        gt(verificationPayments.periodEnd, new Date())
      ))
      .orderBy(desc(verificationPayments.periodEnd))
      .limit(1);
    return payment || undefined;
  }

  async checkAndExpireVerifications(): Promise<void> {
    const now = new Date();
    await db.update(verificationPayments)
      .set({ status: "expired" })
      .where(and(
        eq(verificationPayments.status, "active"),
        lt(verificationPayments.periodEnd, now)
      ));
    
    await db.update(users)
      .set({ isVerified: false, verificationExpiry: null })
      .where(and(
        eq(users.isVerified, true),
        lt(users.verificationExpiry, now),
        eq(users.verificationGrantedBy, sql`NULL`)
      ));
  }
}

export const storage = new DatabaseStorage();

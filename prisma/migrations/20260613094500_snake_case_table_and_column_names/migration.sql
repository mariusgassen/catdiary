-- Map every model/field to lowercase snake_case physical names so SQL can be
-- written without double-quoting identifiers. This is a pure rename: data is
-- preserved (ALTER ... RENAME, never DROP/CREATE). Index and constraint names
-- are also renamed to the names Prisma derives from the new @@map names so the
-- migration history stays in sync.

-- Enum types
ALTER TYPE "FrameStyle" RENAME TO "frame_style";
ALTER TYPE "NotificationType" RENAME TO "notification_type";

-- Tables
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Account" RENAME TO "accounts";
ALTER TABLE "VerificationToken" RENAME TO "verification_tokens";
ALTER TABLE "CatEntry" RENAME TO "cat_entries";
ALTER TABLE "EntryView" RENAME TO "entry_views";
ALTER TABLE "CatEntryPhoto" RENAME TO "cat_entry_photos";
ALTER TABLE "Follow" RENAME TO "follows";
ALTER TABLE "Like" RENAME TO "likes";
ALTER TABLE "Comment" RENAME TO "comments";
ALTER TABLE "Notification" RENAME TO "notifications";
ALTER TABLE "PushSubscription" RENAME TO "push_subscriptions";

-- Columns: users
ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "users" RENAME COLUMN "displayName" TO "display_name";
ALTER TABLE "users" RENAME COLUMN "avatarKey" TO "avatar_key";
ALTER TABLE "users" RENAME COLUMN "isPrivate" TO "is_private";
ALTER TABLE "users" RENAME COLUMN "isAdmin" TO "is_admin";
ALTER TABLE "users" RENAME COLUMN "inviteCode" TO "invite_code";
ALTER TABLE "users" RENAME COLUMN "invitedById" TO "invited_by_id";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "notifyLikes" TO "notify_likes";
ALTER TABLE "users" RENAME COLUMN "notifyComments" TO "notify_comments";
ALTER TABLE "users" RENAME COLUMN "notifyFollows" TO "notify_follows";
ALTER TABLE "users" RENAME COLUMN "notifyMentions" TO "notify_mentions";

-- Columns: accounts
ALTER TABLE "accounts" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "accounts" RENAME COLUMN "providerAccountId" TO "provider_account_id";

-- Columns: cat_entries
ALTER TABLE "cat_entries" RENAME COLUMN "ownerId" TO "owner_id";
ALTER TABLE "cat_entries" RENAME COLUMN "locationName" TO "location_name";
ALTER TABLE "cat_entries" RENAME COLUMN "frameStyle" TO "frame_style";
ALTER TABLE "cat_entries" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: entry_views
ALTER TABLE "entry_views" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "entry_views" RENAME COLUMN "catEntryId" TO "cat_entry_id";
ALTER TABLE "entry_views" RENAME COLUMN "feedImpressions" TO "feed_impressions";
ALTER TABLE "entry_views" RENAME COLUMN "dwellMs" TO "dwell_ms";
ALTER TABLE "entry_views" RENAME COLUMN "maxReadPct" TO "max_read_pct";
ALTER TABLE "entry_views" RENAME COLUMN "firstSeenAt" TO "first_seen_at";
ALTER TABLE "entry_views" RENAME COLUMN "lastSeenAt" TO "last_seen_at";

-- Columns: cat_entry_photos
ALTER TABLE "cat_entry_photos" RENAME COLUMN "catEntryId" TO "cat_entry_id";
ALTER TABLE "cat_entry_photos" RENAME COLUMN "photoKey" TO "photo_key";
ALTER TABLE "cat_entry_photos" RENAME COLUMN "thumbKey" TO "thumb_key";

-- Columns: follows
ALTER TABLE "follows" RENAME COLUMN "followerId" TO "follower_id";
ALTER TABLE "follows" RENAME COLUMN "followeeId" TO "followee_id";
ALTER TABLE "follows" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: likes
ALTER TABLE "likes" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "likes" RENAME COLUMN "catEntryId" TO "cat_entry_id";
ALTER TABLE "likes" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: comments
ALTER TABLE "comments" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "comments" RENAME COLUMN "catEntryId" TO "cat_entry_id";
ALTER TABLE "comments" RENAME COLUMN "parentId" TO "parent_id";
ALTER TABLE "comments" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: notifications
ALTER TABLE "notifications" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "notifications" RENAME COLUMN "actorId" TO "actor_id";
ALTER TABLE "notifications" RENAME COLUMN "catEntryId" TO "cat_entry_id";
ALTER TABLE "notifications" RENAME COLUMN "commentId" TO "comment_id";
ALTER TABLE "notifications" RENAME COLUMN "createdAt" TO "created_at";

-- Columns: push_subscriptions
ALTER TABLE "push_subscriptions" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "push_subscriptions" RENAME COLUMN "createdAt" TO "created_at";

-- Indexes & primary keys (renaming a constraint's backing index renames the
-- primary-key constraint too; the unique "_key" objects are plain indexes).
ALTER INDEX "User_pkey" RENAME TO "users_pkey";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";
ALTER INDEX "User_username_key" RENAME TO "users_username_key";
ALTER INDEX "User_inviteCode_key" RENAME TO "users_invite_code_key";
ALTER INDEX "Account_pkey" RENAME TO "accounts_pkey";
ALTER INDEX "Account_provider_providerAccountId_key" RENAME TO "accounts_provider_provider_account_id_key";
ALTER INDEX "VerificationToken_identifier_token_key" RENAME TO "verification_tokens_identifier_token_key";
ALTER INDEX "CatEntry_pkey" RENAME TO "cat_entries_pkey";
ALTER INDEX "CatEntry_ownerId_createdAt_idx" RENAME TO "cat_entries_owner_id_created_at_idx";
ALTER INDEX "CatEntry_embedding_hnsw_idx" RENAME TO "cat_entries_embedding_hnsw_idx";
ALTER INDEX "EntryView_pkey" RENAME TO "entry_views_pkey";
ALTER INDEX "EntryView_catEntryId_idx" RENAME TO "entry_views_cat_entry_id_idx";
ALTER INDEX "EntryView_userId_lastSeenAt_idx" RENAME TO "entry_views_user_id_last_seen_at_idx";
ALTER INDEX "CatEntryPhoto_pkey" RENAME TO "cat_entry_photos_pkey";
ALTER INDEX "CatEntryPhoto_catEntryId_position_idx" RENAME TO "cat_entry_photos_cat_entry_id_position_idx";
ALTER INDEX "Follow_pkey" RENAME TO "follows_pkey";
ALTER INDEX "Like_pkey" RENAME TO "likes_pkey";
ALTER INDEX "Comment_pkey" RENAME TO "comments_pkey";
ALTER INDEX "Comment_catEntryId_createdAt_idx" RENAME TO "comments_cat_entry_id_created_at_idx";
ALTER INDEX "Comment_parentId_idx" RENAME TO "comments_parent_id_idx";
ALTER INDEX "Notification_pkey" RENAME TO "notifications_pkey";
ALTER INDEX "Notification_userId_read_createdAt_idx" RENAME TO "notifications_user_id_read_created_at_idx";
ALTER INDEX "Notification_userId_createdAt_idx" RENAME TO "notifications_user_id_created_at_idx";
ALTER INDEX "PushSubscription_pkey" RENAME TO "push_subscriptions_pkey";
ALTER INDEX "PushSubscription_endpoint_key" RENAME TO "push_subscriptions_endpoint_key";
ALTER INDEX "PushSubscription_userId_idx" RENAME TO "push_subscriptions_user_id_idx";

-- Foreign-key constraints
ALTER TABLE "users" RENAME CONSTRAINT "User_invitedById_fkey" TO "users_invited_by_id_fkey";
ALTER TABLE "accounts" RENAME CONSTRAINT "Account_userId_fkey" TO "accounts_user_id_fkey";
ALTER TABLE "cat_entries" RENAME CONSTRAINT "CatEntry_ownerId_fkey" TO "cat_entries_owner_id_fkey";
ALTER TABLE "entry_views" RENAME CONSTRAINT "EntryView_userId_fkey" TO "entry_views_user_id_fkey";
ALTER TABLE "entry_views" RENAME CONSTRAINT "EntryView_catEntryId_fkey" TO "entry_views_cat_entry_id_fkey";
ALTER TABLE "cat_entry_photos" RENAME CONSTRAINT "CatEntryPhoto_catEntryId_fkey" TO "cat_entry_photos_cat_entry_id_fkey";
ALTER TABLE "follows" RENAME CONSTRAINT "Follow_followerId_fkey" TO "follows_follower_id_fkey";
ALTER TABLE "follows" RENAME CONSTRAINT "Follow_followeeId_fkey" TO "follows_followee_id_fkey";
ALTER TABLE "likes" RENAME CONSTRAINT "Like_userId_fkey" TO "likes_user_id_fkey";
ALTER TABLE "likes" RENAME CONSTRAINT "Like_catEntryId_fkey" TO "likes_cat_entry_id_fkey";
ALTER TABLE "comments" RENAME CONSTRAINT "Comment_userId_fkey" TO "comments_user_id_fkey";
ALTER TABLE "comments" RENAME CONSTRAINT "Comment_catEntryId_fkey" TO "comments_cat_entry_id_fkey";
ALTER TABLE "comments" RENAME CONSTRAINT "Comment_parentId_fkey" TO "comments_parent_id_fkey";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_userId_fkey" TO "notifications_user_id_fkey";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_actorId_fkey" TO "notifications_actor_id_fkey";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_catEntryId_fkey" TO "notifications_cat_entry_id_fkey";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_commentId_fkey" TO "notifications_comment_id_fkey";
ALTER TABLE "push_subscriptions" RENAME CONSTRAINT "PushSubscription_userId_fkey" TO "push_subscriptions_user_id_fkey";

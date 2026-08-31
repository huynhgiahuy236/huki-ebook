/**
 * HUKI EBOOK - Community Domain Swagger DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Forum post response
 */
export class ForumPostDto {
  @ApiProperty({ description: 'Post ID' })
  id: string;

  @ApiProperty({ description: 'Post title' })
  title: string;

  @ApiProperty({ description: 'Post content' })
  content: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiPropertyOptional({ description: 'Author name' })
  authorName?: string;

  @ApiPropertyOptional({ description: 'Author avatar' })
  authorAvatar?: string;

  @ApiProperty({ description: 'Post status' })
  status: string;

  @ApiProperty({ description: 'Like count' })
  likeCount: number;

  @ApiProperty({ description: 'Comment count' })
  commentCount: number;

  @ApiProperty({ description: 'Is liked by current user' })
  isLiked?: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;
}

/**
 * Forum comment response
 */
export class ForumCommentDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Post ID' })
  postId: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  parentId?: string;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: 'Author ID' })
  authorId: string;

  @ApiPropertyOptional({ description: 'Author name' })
  authorName?: string;

  @ApiPropertyOptional({ description: 'Author avatar' })
  authorAvatar?: string;

  @ApiProperty({ description: 'Reply count' })
  replyCount: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Review response
 */
export class ReviewDto {
  @ApiProperty({ description: 'Review ID' })
  id: string;

  @ApiProperty({ description: 'Book ID' })
  bookId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiPropertyOptional({ description: 'User name' })
  userName?: string;

  @ApiPropertyOptional({ description: 'User avatar' })
  userAvatar?: string;

  @ApiProperty({ description: 'Rating (1-5)' })
  rating: number;

  @ApiPropertyOptional({ description: 'Review title' })
  title?: string;

  @ApiProperty({ description: 'Review content' })
  content: string;

  @ApiPropertyOptional({ description: 'Has photos' })
  hasPhotos?: boolean;

  @ApiProperty({ description: 'Helpful count' })
  helpfulCount: number;

  @ApiProperty({ description: 'Is marked helpful by current user' })
  isHelpful?: boolean;

  @ApiPropertyOptional({ description: 'Seller reply' })
  sellerReply?: object;

  @ApiProperty({ description: 'Review status' })
  status: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Seller reply response
 */
export class SellerReplyDto {
  @ApiProperty({ description: 'Reply content' })
  content: string;

  @ApiProperty({ description: 'Replied at timestamp' })
  repliedAt: string;
}

/**
 * Conversation response
 */
export class ConversationDto {
  @ApiProperty({ description: 'Conversation ID' })
  id: string;

  @ApiProperty({ description: 'Initiator ID' })
  initiatorId: string;

  @ApiProperty({ description: 'Participant ID' })
  participantId: string;

  @ApiProperty({ description: 'Participant name' })
  participantName?: string;

  @ApiPropertyOptional({ description: 'Participant avatar' })
  participantAvatar?: string;

  @ApiProperty({ description: 'Last message' })
  lastMessage?: string;

  @ApiPropertyOptional({ description: 'Last message time' })
  lastMessageAt?: string;

  @ApiProperty({ description: 'Unread count' })
  unreadCount: number;

  @ApiProperty({ description: 'Conversation status' })
  status: string;

  @ApiPropertyOptional({ description: 'Related book ID if applicable' })
  bookId?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Chat message response
 */
export class ChatMessageDto {
  @ApiProperty({ description: 'Message ID' })
  id: string;

  @ApiProperty({ description: 'Conversation ID' })
  conversationId: string;

  @ApiProperty({ description: 'Sender ID' })
  senderId: string;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiPropertyOptional({ description: 'Attachment URL' })
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: 'Attachment type' })
  attachmentType?: string;

  @ApiProperty({ description: 'Is from current user' })
  isMine?: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Notification response
 */
export class NotificationDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Notification type' })
  type: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification body' })
  body: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  entityId?: string;

  @ApiProperty({ description: 'Is notification read' })
  isRead: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;
}

/**
 * Notification settings response
 */
export class NotificationSettingsDto {
  @ApiProperty({ description: 'Email notifications enabled' })
  emailEnabled: boolean;

  @ApiProperty({ description: 'Push notifications enabled' })
  pushEnabled: boolean;

  @ApiProperty({ description: 'SMS notifications enabled' })
  smsEnabled: boolean;

  @ApiPropertyOptional({ description: 'Order updates enabled' })
  orderUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Promotion updates enabled' })
  promotionUpdates?: boolean;
}

/**
 * Moderation report response
 */
export class ModerationReportDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report type' })
  type: string;

  @ApiProperty({ description: 'Target type (post/comment/review)' })
  targetType: string;

  @ApiProperty({ description: 'Target ID' })
  targetId: string;

  @ApiPropertyOptional({ description: 'Target content preview' })
  targetPreview?: string;

  @ApiProperty({ description: 'Reporter ID' })
  reporterId: string;

  @ApiProperty({ description: 'Report reason' })
  reason: string;

  @ApiPropertyOptional({ description: 'Additional description' })
  description?: string;

  @ApiProperty({ description: 'Report status' })
  status: string;

  @ApiPropertyOptional({ description: 'Resolved by admin' })
  resolvedBy?: string;

  @ApiPropertyOptional({ description: 'Resolution notes' })
  resolution?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Resolved timestamp' })
  resolvedAt?: string;
}

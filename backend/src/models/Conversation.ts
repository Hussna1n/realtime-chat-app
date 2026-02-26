import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  admin?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  groupAvatar: { type: String },
  admin: { type: Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);

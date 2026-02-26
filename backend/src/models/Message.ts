import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
  readBy: mongoose.Types.ObjectId[];
  replyTo?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'file', 'audio'], default: 'text' },
  fileUrl: String,
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

export default mongoose.model<IMessage>('Message', MessageSchema);

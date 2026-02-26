import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Message from './models/Message';
import Conversation from './models/Conversation';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] }
});

// JWT middleware for socket
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    (socket as any).userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const onlineUsers = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket: Socket) => {
  const userId = (socket as any).userId;
  onlineUsers.set(userId, socket.id);
  io.emit('users:online', Array.from(onlineUsers.keys()));

  socket.on('conversation:join', (conversationId: string) => {
    socket.join(conversationId);
  });

  socket.on('message:send', async (data: { conversationId: string; content: string; type?: string }) => {
    const message = await Message.create({
      conversation: data.conversationId,
      sender: userId,
      content: data.content,
      type: data.type || 'text',
    });

    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    const populated = await message.populate('sender', 'username avatar');
    io.to(data.conversationId).emit('message:new', populated);
  });

  socket.on('typing:start', (conversationId: string) => {
    socket.to(conversationId).emit('typing:start', { userId, conversationId });
  });

  socket.on('typing:stop', (conversationId: string) => {
    socket.to(conversationId).emit('typing:stop', { userId, conversationId });
  });

  socket.on('message:read', async (data: { messageIds: string[]; conversationId: string }) => {
    await Message.updateMany(
      { _id: { $in: data.messageIds }, sender: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    socket.to(data.conversationId).emit('message:read', { userId, messageIds: data.messageIds });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

// REST endpoints
app.get('/api/conversations', async (req, res) => {
  const userId = (req as any).userId;
  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'username avatar')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
  res.json(conversations);
});

app.get('/api/conversations/:id/messages', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const messages = await Message.find({ conversation: req.params.id })
    .sort({ createdAt: -1 })
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .populate('sender', 'username avatar');
  res.json(messages.reverse());
});

mongoose.connect(process.env.MONGODB_URI!).then(() => {
  httpServer.listen(process.env.PORT || 3001, () =>
    console.log(`Chat server running on port ${process.env.PORT || 3001}`)
  );
});

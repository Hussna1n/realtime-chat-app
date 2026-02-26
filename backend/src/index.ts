import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { setupSocket } from './socket/chatSocket';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: process.env.CLIENT_URL || '*' } });

app.use(cors()); app.use(express.json());
setupSocket(io);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app')
  .then(() => server.listen(5000, () => console.log('Chat server running on port 5000')));

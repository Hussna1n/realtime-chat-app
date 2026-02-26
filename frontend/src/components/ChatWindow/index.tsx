import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Phone, Video, MoreVertical } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface Message {
  _id: string; content: string; sender: { _id: string; username: string; avatar: string };
  messageType: string; createdAt: string; readBy: string[];
}

interface Props {
  conversationId: string; currentUserId: string;
  recipient: { _id: string; username: string; fullName: string; avatar: string; isOnline: boolean };
  socket: Socket;
}

export default function ChatWindow({ conversationId, currentUserId, recipient, socket }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    socket.emit('join_conversation', conversationId);
    socket.on('new_message', (msg: Message) => setMessages(prev => [...prev, msg]));
    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId !== currentUserId) setIsTyping(true);
    });
    socket.on('user_stopped_typing', () => setIsTyping(false));
    return () => { socket.off('new_message'); socket.off('user_typing'); socket.off('user_stopped_typing'); };
  }, [conversationId, socket, currentUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    socket.emit('typing_start', { conversationId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing_stop', { conversationId }), 1000);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit('send_message', { conversationId, content: input, messageType: 'text' });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={recipient.avatar || `https://ui-avatars.com/api/?name=${recipient.fullName}`}
              className="w-10 h-10 rounded-full" alt="" />
            {recipient.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{recipient.fullName}</p>
            <p className="text-xs text-gray-500">{recipient.isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>
        <div className="flex gap-3 text-gray-500">
          <button className="hover:text-blue-600"><Phone className="w-5 h-5" /></button>
          <button className="hover:text-blue-600"><Video className="w-5 h-5" /></button>
          <button className="hover:text-gray-700"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {messages.map(msg => {
          const isMine = msg.sender._id === currentUserId;
          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <img src={msg.sender.avatar} className="w-7 h-7 rounded-full mr-2 self-end" alt="" />
              )}
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                isMine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {msg.content}
                <div className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && msg.readBy.length > 1 && ' ✓✓'}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {recipient.username} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
          <button className="text-gray-400 hover:text-gray-600"><Smile className="w-5 h-5" /></button>
          <input value={input} onChange={handleInput}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-transparent text-sm outline-none" placeholder="Type a message..." />
          <button className="text-gray-400 hover:text-gray-600"><Paperclip className="w-5 h-5" /></button>
          <button onClick={sendMessage} className="text-blue-600 hover:text-blue-700 ml-1">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Send, Image, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '../../hooks/useSocket';
import { useAppSelector } from '../../store/hooks';

interface Message {
  _id: string;
  sender: { _id: string; username: string; avatar?: string };
  content: string;
  type: 'text' | 'image';
  readBy: string[];
  createdAt: string;
}

interface Props {
  conversationId: string;
  participantName: string;
  participantAvatar?: string;
}

export default function ChatWindow({ conversationId, participantName, participantAvatar }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const currentUser = useAppSelector(s => s.auth.user);
  const socket = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!socket) return;
    socket.emit('conversation:join', conversationId);

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('typing:start', (data: { userId: string }) => {
      if (data.userId !== currentUser?._id) setIsTyping(true);
    });

    socket.on('typing:stop', (data: { userId: string }) => {
      if (data.userId !== currentUser?._id) setIsTyping(false);
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [socket, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    socket?.emit('typing:start', conversationId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket?.emit('typing:stop', conversationId);
    }, 1500);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit('message:send', { conversationId, content: input });
    setInput('');
    socket.emit('typing:stop', conversationId);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
        <img src={participantAvatar || `https://ui-avatars.com/api/?name=${participantName}`}
          className="w-9 h-9 rounded-full" alt={participantName} />
        <div>
          <p className="font-semibold text-gray-900 text-sm">{participantName}</p>
          {isTyping && <p className="text-xs text-green-500">typing...</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.sender._id === currentUser?._id;
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.type === 'image'
                  ? <img src={msg.content} alt="sent" className="rounded-xl max-w-xs" />
                  : (
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe
                      ? 'bg-blue-500 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  )
                }
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                  {isMe && (
                    msg.readBy.length > 1
                      ? <CheckCheck size={12} className="text-blue-400" />
                      : <Check size={12} className="text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t border-gray-100">
        <button type="button" className="text-gray-400 hover:text-blue-500">
          <Image size={20} />
        </button>
        <input value={input} onChange={e => { setInput(e.target.value); handleTyping(); }}
          placeholder="Type a message..." className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none" />
        <button type="submit" disabled={!input.trim()}
          className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 disabled:opacity-40">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

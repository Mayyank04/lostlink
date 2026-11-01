'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Conversation, Message } from '@/types/message';
import { MessageService } from '@/lib/services/api';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Building,
  Flag,
  UserX,
  Lock,
  ArrowLeft,
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const { success, info } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newText, setNewText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const convs = await MessageService.getConversations(user.id);
      setConversations(convs);
      if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedConvId) return;
    MessageService.getMessages(selectedConvId).then((msgs) => {
      setMessages(msgs);
    });
  }, [selectedConvId]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !selectedConvId || !user) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConvId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role === 'student' ? 'student' : 'admin',
      content: newText.trim(),
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    await MessageService.sendMessage(newMsg);
    setMessages((prev) => [...prev, newMsg]);
    setNewText('');
    loadConversations();
  };

  const handleBlock = () => {
    info('User Blocked', 'You will no longer receive direct messages in this thread.');
  };

  const handleReport = () => {
    success('Conversation Reported', 'Campus dispatch has received a transcript copy for review.');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Campus Secure Communications
          </h1>
          <p className="text-xs text-slate-500">
            Encrypted in-app messaging tied directly to verified item claims and custody desks
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        {/* Left: Conversation List */}
        <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Threads ({conversations.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {conversations.length > 0 ? (
              conversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-brandTeal-50/60 dark:bg-brandTeal-950/30 border-l-4 border-brandTeal-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0 text-xs">
                      {c.itemTitle.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {c.itemTitle}
                        </h4>
                        {c.lastMessageTimestamp && (
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(c.lastMessageTimestamp)}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{c.itemReference}</span>
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {c.lastMessage || 'New conversation'}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No active conversations yet. Messages are initiated from claim cards or item details.
              </div>
            )}
          </div>
        </div>

        {/* Right: Message Thread */}
        <div className="md:col-span-7 flex flex-col justify-between bg-slate-50/30 dark:bg-slate-900/30">
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {activeConversation.itemTitle}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="font-mono">{activeConversation.itemReference}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-3 h-3" /> Campus Verified
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleReport}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Report message thread"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleBlock}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Block participant"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="text-center my-2">
                  <span className="text-[10px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Communications are monitored by Campus Safety for student protection.
                  </span>
                </div>

                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span>•</span>
                        <span>{timeAgo(msg.createdAt)}</span>
                      </div>
                      <div
                        className={`max-w-sm rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                          isMe
                            ? 'bg-brandTeal-700 text-white rounded-br-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type a message (never share passwords or unverified funds)..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-600"
                />
                <Button type="submit" size="sm" variant="primary" disabled={!newText.trim()}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-xs text-slate-400">
              Select a conversation to read and respond.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


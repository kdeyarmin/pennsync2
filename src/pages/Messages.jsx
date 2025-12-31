import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  MailOpen,
  Send,
  Reply,
  Paperclip,
  AlertCircle,
  Clock,
  CheckCircle2,
  User
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [newMessage, setNewMessage] = useState({
    subject: "",
    message_text: "",
    recipients: [],
    priority: "normal",
    patient_id: null
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('first_name', 100),
    initialData: [],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const message = messages.find(m => m.id === messageId);
      const readBy = message.read_by || [];
      if (!readBy.includes(currentUser.email)) {
        await base44.entities.Message.update(messageId, {
          is_read: true,
          read_by: [...readBy, currentUser.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.Message.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowNewMessage(false);
      setNewMessage({
        subject: "",
        message_text: "",
        recipients: [],
        priority: "normal",
        patient_id: null
      });
    },
  });

  // Group messages by thread
  const groupedMessages = messages.reduce((acc, msg) => {
    const threadId = msg.thread_id || msg.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(msg);
    return acc;
  }, {});

  // Get thread preview (most recent message)
  const threads = Object.entries(groupedMessages).map(([threadId, threadMessages]) => {
    const sortedMessages = threadMessages.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
    const latestMessage = sortedMessages[0];
    const unreadCount = threadMessages.filter(m => 
      !m.read_by?.includes(currentUser?.email)
    ).length;
    
    return {
      threadId,
      messages: sortedMessages,
      latestMessage,
      unreadCount,
      subject: latestMessage.subject || 'No Subject',
      priority: latestMessage.priority || 'normal',
      isMyMessage: latestMessage.sender_email === currentUser?.email,
      isRecipient: latestMessage.recipients?.includes(currentUser?.email)
    };
  });

  // Filter threads
  const filteredThreads = threads
    .filter(thread => thread.isRecipient || thread.isMyMessage)
    .filter(thread => {
      if (filterPriority !== "all" && thread.priority !== filterPriority) return false;
      if (filterRead === "unread" && thread.unreadCount === 0) return false;
      if (filterRead === "read" && thread.unreadCount > 0) return false;
      return true;
    })
    .sort((a, b) => new Date(b.latestMessage.created_date) - new Date(a.latestMessage.created_date));

  const handleThreadClick = (thread) => {
    setSelectedThread(thread);
    // Mark all unread messages in thread as read
    thread.messages
      .filter(m => !m.read_by?.includes(currentUser?.email))
      .forEach(m => markAsReadMutation.mutate(m.id));
  };

  const handleSendMessage = () => {
    if (!newMessage.message_text || newMessage.recipients.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    sendMessageMutation.mutate({
      ...newMessage,
      sender_name: currentUser?.full_name,
      sender_email: currentUser?.email,
      thread_id: null
    });
  };

  const handleReply = () => {
    if (!selectedThread) return;
    
    const replyText = prompt('Enter your reply:');
    if (!replyText) return;

    const originalMessage = selectedThread.latestMessage;
    sendMessageMutation.mutate({
      subject: `Re: ${originalMessage.subject}`,
      message_text: replyText,
      sender_name: currentUser?.full_name,
      sender_email: currentUser?.email,
      recipients: [originalMessage.sender_email],
      priority: originalMessage.priority,
      patient_id: originalMessage.patient_id,
      thread_id: selectedThread.threadId
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      default: return 'bg-blue-600';
    }
  };

  const unreadCount = threads.filter(t => t.unreadCount > 0).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-8 h-8" />
            Messages
            {unreadCount > 0 && (
              <Badge className="bg-red-600">{unreadCount} Unread</Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Secure internal messaging for patient care coordination</p>
        </div>
        <Button
          onClick={() => setShowNewMessage(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[150px]">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger>
                  <SelectValue placeholder="All Messages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Thread List */}
        <div className="md:col-span-1 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : filteredThreads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No messages found</p>
              </CardContent>
            </Card>
          ) : (
            filteredThreads.map(thread => (
              <Card
                key={thread.threadId}
                className={`cursor-pointer hover:shadow-md transition-all ${
                  selectedThread?.threadId === thread.threadId ? 'border-blue-500 border-2' : ''
                } ${thread.unreadCount > 0 ? 'bg-blue-50' : ''}`}
                onClick={() => handleThreadClick(thread)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {thread.unreadCount > 0 ? (
                        <Mail className="w-5 h-5 text-blue-600" />
                      ) : (
                        <MailOpen className="w-5 h-5 text-gray-400" />
                      )}
                      <Badge className={getPriorityColor(thread.priority)}>
                        {thread.priority}
                      </Badge>
                    </div>
                    {thread.unreadCount > 0 && (
                      <Badge className="bg-red-600">{thread.unreadCount}</Badge>
                    )}
                  </div>
                  <h4 className={`font-semibold text-sm mb-1 ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {thread.subject}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    {thread.isMyMessage ? 'You' : thread.latestMessage.sender_name}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {thread.latestMessage.message_text}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(thread.latestMessage.created_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="md:col-span-2">
          {selectedThread ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {selectedThread.subject}
                    <Badge className={getPriorityColor(selectedThread.priority)}>
                      {selectedThread.priority}
                    </Badge>
                  </CardTitle>
                  <Button size="sm" onClick={handleReply}>
                    <Reply className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedThread.messages.map((msg, idx) => (
                  <Card key={msg.id} className={msg.sender_email === currentUser?.email ? 'bg-blue-50' : 'bg-gray-50'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {msg.sender_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{msg.sender_name}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(msg.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        {msg.read_by?.includes(currentUser?.email) && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.message_text}</p>
                      {msg.patient_id && (
                        <Link
                          to={createPageUrl(`PatientDetails?id=${msg.patient_id}`)}
                          className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          <User className="w-3 h-3" />
                          View Patient
                        </Link>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Paperclip className="w-3 h-3" />
                              Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a message to view the conversation</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Recipients *</label>
              <Select
                value={newMessage.recipients[0] || ""}
                onValueChange={(value) => setNewMessage({...newMessage, recipients: [value]})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Related Patient (Optional)</label>
              <Select
                value={newMessage.patient_id || ""}
                onValueChange={(value) => setNewMessage({...newMessage, patient_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <Select
                value={newMessage.priority}
                onValueChange={(value) => setNewMessage({...newMessage, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Subject *</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                placeholder="Enter subject"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Message *</label>
              <Textarea
                value={newMessage.message_text}
                onChange={(e) => setNewMessage({...newMessage, message_text: e.target.value})}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMessage(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
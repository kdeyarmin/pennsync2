import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [replyText, setReplyText] = useState("");
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
    queryFn: () => base44.entities.User.list('full_name', 200),
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
      if (!message || !currentUser?.email) return;
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
    setReplyText("");
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
    if (!selectedThread || !replyText.trim()) return;

    const originalMessage = selectedThread.latestMessage;
    sendMessageMutation.mutate({
      subject: `Re: ${originalMessage.subject}`,
      message_text: replyText.trim(),
      sender_name: currentUser?.full_name,
      sender_email: currentUser?.email,
      recipients: [originalMessage.sender_email],
      priority: originalMessage.priority,
      patient_id: originalMessage.patient_id,
      thread_id: selectedThread.threadId
    });
    setReplyText("");
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
            <span className="truncate">Messages</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-600 text-xs sm:text-sm flex-shrink-0">{unreadCount} Unread</Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 hidden sm:block">Secure internal messaging for patient care coordination</p>
        </div>
        <Button
          onClick={() => setShowNewMessage(true)}
          className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
        >
          <Send className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-11 touch-target">
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
            <div>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="h-11 touch-target">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Thread List */}
        <div className="lg:col-span-1 space-y-2 sm:space-y-3 max-h-[600px] overflow-y-auto pr-1">
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
                className={`cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all ${
                  selectedThread?.threadId === thread.threadId ? 'border-indigo-500 border-2' : ''
                } ${thread.unreadCount > 0 ? 'bg-blue-50' : ''}`}
                onClick={() => handleThreadClick(thread)}
              >
                <CardContent className="p-3 sm:p-4">
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
        <div className="lg:col-span-2">
          {selectedThread ? (
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                  <span className="break-words">{selectedThread.subject}</span>
                  <Badge className={getPriorityColor(selectedThread.priority)}>
                    {selectedThread.priority}
                  </Badge>
                </CardTitle>
                <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || sendMessageMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 min-h-[44px] w-full sm:w-auto">
                  <Reply className="w-4 h-4 mr-1" />
                  Send Reply
                </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                {selectedThread.messages.map((msg, idx) => (
                  <Card key={msg.id} className={msg.sender_email === currentUser?.email ? 'bg-blue-50' : 'bg-gray-50'}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {msg.sender_name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{msg.sender_name}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(msg.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        {msg.read_by?.includes(currentUser?.email) && (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{msg.message_text}</p>
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

              {/* Inline Reply Box */}
              <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className="resize-none"
                />
              </div>
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
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Recipients *</label>
              <Select
                value={newMessage.recipients[0] || ""}
                onValueChange={(value) => setNewMessage({...newMessage, recipients: [value]})}
              >
                <SelectTrigger className="h-11">
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
              <label className="text-sm font-semibold mb-2 block">Related Patient (Optional)</label>
              <Select
                value={newMessage.patient_id || ""}
                onValueChange={(value) => setNewMessage({...newMessage, patient_id: value || null})}
              >
                <SelectTrigger className="h-11">
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
              <label className="text-sm font-semibold mb-2 block">Priority</label>
              <Select
                value={newMessage.priority}
                onValueChange={(value) => setNewMessage({...newMessage, priority: value})}
              >
                <SelectTrigger className="h-11">
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
              <label className="text-sm font-semibold mb-2 block">Subject *</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                placeholder="Enter subject"
                className="h-11"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Message *</label>
              <Textarea
                value={newMessage.message_text}
                onChange={(e) => setNewMessage({...newMessage, message_text: e.target.value})}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowNewMessage(false)} className="min-h-[44px] w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
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
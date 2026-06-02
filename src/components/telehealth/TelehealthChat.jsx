import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

<<<<<<< HEAD
export default function TelehealthChat({ sessionId, userName }) {
  const [messages, setMessages] = useState([]);
=======
// Presentational chat panel. Messages and sending are owned by the parent
// (VideoRoom), which transmits them over the Twilio data track so both sides
// actually receive them.
export default function TelehealthChat({ messages = [], onSend, userName }) {
>>>>>>> origin/main
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
<<<<<<< HEAD
    // Auto-scroll to bottom when new messages arrive
=======
>>>>>>> origin/main
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
<<<<<<< HEAD
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      sender: userName,
      text: newMessage,
      timestamp: new Date().toISOString(),
      isSelf: true
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Here you would broadcast the message via WebSocket or data channel
=======
    const text = newMessage.trim();
    if (!text) return;
    onSend?.(text);
    setNewMessage('');
>>>>>>> origin/main
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
<<<<<<< HEAD
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          Session Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 gap-3">
=======
    <Card className="flex flex-col h-80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 gap-3 min-h-0">
>>>>>>> origin/main
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
<<<<<<< HEAD
                No messages yet. Start the conversation!
=======
                No messages yet. Say hello!
>>>>>>> origin/main
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.isSelf
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
<<<<<<< HEAD
                    {!msg.isSelf && (
=======
                    {!msg.isSelf && msg.sender && (
>>>>>>> origin/main
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        {msg.sender}
                      </p>
                    )}
<<<<<<< HEAD
                    <p className="text-sm">{msg.text}</p>
=======
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
>>>>>>> origin/main
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
<<<<<<< HEAD
          />
          <Button onClick={handleSend} size="icon">
=======
            aria-label={`Message as ${userName || 'you'}`}
          />
          <Button onClick={handleSend} size="icon" disabled={!newMessage.trim()}>
>>>>>>> origin/main
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main

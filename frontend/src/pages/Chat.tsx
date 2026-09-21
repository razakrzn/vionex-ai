import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Search, Phone, Video, MoreVertical, Check, CheckCheck } from "lucide-react";
import Seo from "@/components/Seo";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  text: string;
  time: string;
  sender: "me" | "other";
  status: "sent" | "delivered" | "read";
}

const mockConversations: Conversation[] = [
  { id: "1", name: "Ahmed Hassan", avatar: "", lastMessage: "Is the space still available?", time: "2m", unread: 2, online: true },
  { id: "2", name: "Sarah Ali", avatar: "", lastMessage: "I'm interested in the car", time: "15m", unread: 0, online: false },
  { id: "3", name: "Mohammed Khan", avatar: "", lastMessage: "Can we negotiate the price?", time: "1h", unread: 1, online: true },
  { id: "4", name: "Fatima Rashid", avatar: "", lastMessage: "Thanks for the information!", time: "3h", unread: 0, online: false },
  { id: "5", name: "Omar Saeed", avatar: "", lastMessage: "When can I visit?", time: "1d", unread: 0, online: true },
];

const mockMessages: Message[] = [
  { id: "1", text: "Hello! I saw your listing for the Executive Space in Dubai Marina", time: "10:30 AM", sender: "other", status: "read" },
  { id: "2", text: "Hi! Yes, it's still available. Are you interested?", time: "10:32 AM", sender: "me", status: "read" },
  { id: "3", text: "Yes, very much! Is the space furnished?", time: "10:33 AM", sender: "other", status: "read" },
  { id: "4", text: "Yes, it comes fully furnished with AC, WiFi, and attached bathroom", time: "10:35 AM", sender: "me", status: "read" },
  { id: "5", text: "That sounds perfect! What's the monthly rent?", time: "10:36 AM", sender: "other", status: "read" },
  { id: "6", text: "It's 1,200 AED per month, all utilities included", time: "10:38 AM", sender: "me", status: "delivered" },
  { id: "7", text: "Is the space still available?", time: "10:40 AM", sender: "other", status: "read" },
];

const Chat = () => {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = mockConversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (message.trim()) {
      // In real app, this would send to backend

      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Seo
        title="Chat"
        description="Message buyers and sellers directly on Vionex AI."
        noIndex
      />
      {/* Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-glass-border flex flex-col ${selectedConversation ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b border-glass-border glass">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold">Messages</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
                selectedConversation?.id === conversation.id ? "bg-secondary" : ""
              }`}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {conversation.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                {conversation.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground truncate">{conversation.name}</h3>
                  <span className="text-xs text-muted-foreground">{conversation.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
              </div>
              {conversation.unread > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {conversation.unread}
                </span>
              )}
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-glass-border glass flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {selectedConversation.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-medium text-foreground">{selectedConversation.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {mockMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender === "me"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.sender === "me" ? "justify-end" : ""}`}>
                        <span className="text-[10px] opacity-70">{msg.time}</span>
                        {msg.sender === "me" && (
                          msg.status === "read" ? (
                            <CheckCheck className="h-3 w-3 text-blue-400" />
                          ) : (
                            <Check className="h-3 w-3 opacity-70" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-glass-border glass">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button variant="neon" size="icon" onClick={handleSendMessage}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;

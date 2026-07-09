import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, MinusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAiChat } from "@workspace/api-client-react";

interface Message {
  role: "user" | "ai";
  content: string;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi! I'm your Outreach AI Assistant. How can I help you source leads or optimize campaigns today?" }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMutation = useAiChat();

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    const contextStr = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    chatMutation.mutate({
      data: {
        message: userMessage.content,
        context: contextStr
      }
    }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: "ai", content: data.response }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm having trouble connecting right now." }]);
      }
    });
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl flex items-center justify-center bg-primary text-primary-foreground hover:scale-105 transition-transform z-50"
      >
        <Bot size={28} />
      </Button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 w-80 bg-background border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 transition-all duration-300 ease-in-out",
      isMinimized ? "h-14" : "h-[500px]"
    )}>
      <div className="bg-primary px-4 py-3 text-primary-foreground flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-semibold text-sm">Outreach AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="hover:bg-primary-foreground/20 p-1 rounded-md" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            <MinusSquare size={16} />
          </button>
          <button className="hover:bg-primary-foreground/20 p-1 rounded-md" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-muted text-foreground border rounded-tl-sm"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-muted text-foreground border rounded-tl-sm flex gap-1 items-center">
                  <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 border-t bg-background">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Ask about your campaigns..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 focus-visible:ring-1"
                disabled={chatMutation.isPending}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || chatMutation.isPending}>
                <Send size={16} />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
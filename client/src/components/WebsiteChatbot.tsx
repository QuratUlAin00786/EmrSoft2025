import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Bot, User, Calendar, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: string;
  icon?: any;
}

export function WebsiteChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your Cura EMR assistant. I can help you with:\n\n• Schedule a demo\n• Answer questions about features\n• Connect you with sales\n• Provide pricing information\n\nHow can I help you today?",
      isUser: false,
      timestamp: new Date(),
      quickActions: [
        { label: "Schedule Demo", action: "demo", icon: Calendar },
        { label: "View Pricing", action: "pricing", icon: Mail },
        { label: "Contact Sales", action: "sales", icon: Phone },
        { label: "Learn Features", action: "features", icon: Bot }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = generateBotResponse(message.toLowerCase());
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userMessage: string): Message => {
    let responseText = "";
    let quickActions: QuickAction[] = [];

    if (userMessage.includes("demo") || userMessage.includes("schedule")) {
      responseText = "I'd be happy to help you schedule a demo! You can:\n\n• Book directly through our calendar\n• Speak with a sales representative\n• Try our free trial immediately\n\nWhich would you prefer?";
      quickActions = [
        { label: "Book Demo", action: "book_demo", icon: Calendar },
        { label: "Contact Sales", action: "sales", icon: Phone },
        { label: "Start Trial", action: "trial", icon: Bot }
      ];
    } else if (userMessage.includes("price") || userMessage.includes("cost") || userMessage.includes("pricing")) {
      responseText = "Our pricing is designed to grow with your practice:\n\n• Free Trial: 14 days, up to 10 patients\n• Starter: £49/month, up to 100 patients\n• Professional: £99/month, up to 500 patients\n• Enterprise: £199/month, unlimited patients\n\nWould you like more details about any plan?";
      quickActions = [
        { label: "View Full Pricing", action: "pricing", icon: Mail },
        { label: "Start Free Trial", action: "trial", icon: Bot },
        { label: "Compare Plans", action: "compare", icon: Calendar }
      ];
    } else if (userMessage.includes("feature") || userMessage.includes("what") || userMessage.includes("can")) {
      responseText = "Cura EMR includes comprehensive features:\n\n• Patient Management & EHR\n• AI-Powered Clinical Insights\n• Telemedicine & Video Calls\n• Prescription Management\n• Mobile Apps for Doctors & Patients\n• Advanced Analytics & Reporting\n\nWhat specific feature interests you most?";
      quickActions = [
        { label: "AI Features", action: "ai", icon: Bot },
        { label: "Telemedicine", action: "telemedicine", icon: Phone },
        { label: "Mobile Apps", action: "mobile", icon: Calendar },
        { label: "View All Features", action: "features", icon: Mail }
      ];
    } else if (userMessage.includes("contact") || userMessage.includes("sales") || userMessage.includes("speak")) {
      responseText = "I can connect you with our sales team right away! Here are your options:\n\n• Email: sales@curapms.ai\n• Phone: +44 161 123 4567\n• Schedule a call\n• Live chat with sales rep\n\nHow would you prefer to connect?";
      quickActions = [
        { label: "Schedule Call", action: "call", icon: Phone },
        { label: "Email Sales", action: "email", icon: Mail },
        { label: "Live Chat", action: "live_chat", icon: MessageCircle }
      ];
    } else if (userMessage.includes("trial") || userMessage.includes("free") || userMessage.includes("start")) {
      responseText = "Great choice! Our free trial includes:\n\n• 14 days full access\n• No credit card required\n• Up to 10 patients\n• All core features\n• Full mobile app access\n• Email support\n\nReady to get started?";
      quickActions = [
        { label: "Start Now", action: "start_trial", icon: Bot },
        { label: "Learn More", action: "trial_info", icon: Mail },
        { label: "Schedule Demo", action: "demo", icon: Calendar }
      ];
    } else {
      responseText = "I'd be happy to help! Here are some popular topics:\n\n• Product demos and trials\n• Pricing and plans\n• Feature comparisons\n• Technical support\n• Implementation assistance\n\nWhat would you like to know more about?";
      quickActions = [
        { label: "Schedule Demo", action: "demo", icon: Calendar },
        { label: "View Pricing", action: "pricing", icon: Mail },
        { label: "Contact Sales", action: "sales", icon: Phone },
        { label: "Learn Features", action: "features", icon: Bot }
      ];
    }

    return {
      id: Date.now().toString(),
      text: responseText,
      isUser: false,
      timestamp: new Date(),
      quickActions
    };
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "demo":
      case "book_demo":
        handleSendMessage("I'd like to schedule a demo");
        break;
      case "pricing":
        window.open("/landing/pricing", "_blank");
        break;
      case "sales":
        handleSendMessage("I'd like to speak with sales");
        break;
      case "features":
        window.open("/landing/features", "_blank");
        break;
      case "trial":
      case "start_trial":
        window.open("/auth/login", "_blank");
        break;
      case "email":
        window.open("mailto:sales@curapms.ai");
        break;
      case "call":
        handleSendMessage("I'd like to schedule a call");
        break;
      default:
        handleSendMessage(`I'm interested in ${action}`);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-16 w-16 bg-blue-600 hover:bg-blue-700 shadow-2xl"
          size="lg"
        >
          <MessageCircle className="h-8 w-8" />
        </Button>
        <div className="absolute -top-2 -left-2">
          <div className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-green-400 opacity-75"></div>
          <div className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] flex flex-col">
      <Card className="flex-1 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className="h-8 w-8" />
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-semibold">Cura Assistant</h3>
              <p className="text-xs text-blue-100">Always here to help</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start space-x-2 ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.isUser ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {message.isUser ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.isUser 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                  </div>
                </div>
                {message.quickActions && message.quickActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.quickActions.map((action, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => handleQuickAction(action.action)}
                      >
                        {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                        {action.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about features, pricing, or demos..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSendMessage(inputValue)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
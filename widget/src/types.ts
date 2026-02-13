export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface WidgetConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  welcomeMessage: string;
  botName: string;
}

export interface ChatState {
  isOpen: boolean;
  messages: Message[];
  isTyping: boolean;
  conversationId: string | null;
}

import { h } from 'preact';
import { useState } from 'preact/hooks';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChat } from './hooks/useChat';
import { WidgetConfig } from './types';

interface ChatWindowProps {
  merchantId: string;
  config: WidgetConfig;
  onClose: () => void;
}

export default function ChatWindow({ merchantId, config, onClose }: ChatWindowProps) {
  const { messages, isTyping, isConnected, sendMessage } = useChat(merchantId);

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header" style={{ backgroundColor: config.primaryColor }}>
        <div className="chat-header-content">
          <div className="bot-avatar">
            {config.botName.charAt(0).toUpperCase()}
          </div>
          <div className="header-text">
            <div className="bot-name">{config.botName}</div>
            <div className="status">
              {isConnected ? '● Online' : '○ Connecting...'}
            </div>
          </div>
        </div>
        <button className="close-button" onClick={onClose} aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isTyping={isTyping}
        welcomeMessage={config.welcomeMessage}
      />

      {/* Input */}
      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
}

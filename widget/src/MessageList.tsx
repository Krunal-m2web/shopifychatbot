import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Message } from './types';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  welcomeMessage: string;
}

export default function MessageList({ messages, isTyping, welcomeMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="message-list">
      {/* Welcome message */}
      {messages.length === 0 && (
        <div className="message message-assistant">
          <div className="message-content">{welcomeMessage}</div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message message-${message.role}`}
        >
          <div className="message-content">{message.content}</div>
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <div className="message message-assistant">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

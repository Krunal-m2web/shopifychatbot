import { h } from 'preact';
import { useState } from 'preact/hooks';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!input.trim()) return;

    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-input-container" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message-input"
        placeholder="Type your message..."
        value={input}
        onInput={(e) => setInput((e.target as HTMLInputElement).value)}
        onKeyPress={handleKeyPress}
      />
      <button
        type="submit"
        className="send-button"
        disabled={!input.trim()}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 10L18 2L10 18L8 11L2 10Z" fill="currentColor"/>
        </svg>
      </button>
    </form>
  );
}

import { h } from "preact";
import { useState } from "preact/hooks";
import { Chat } from "./Chat";

export function Widget({ apiUrl, settings, merchantId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="chat-widget-container">
      {/* Chat Button */}
      {!isOpen && (
        <button
          className="chat-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <Chat
            apiUrl={apiUrl}
            settings={settings}
            merchantId={merchantId}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

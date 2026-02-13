import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import ChatWindow from './ChatWindow';
import { WidgetConfig } from './types';
import './styles/widget.css';

interface WidgetProps {
  merchantId: string;
  appUrl: string;
}

export default function Widget({ merchantId, appUrl }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch widget config
  useEffect(() => {
    const shopDomain = window.location.hostname;

    fetch(`${appUrl}/api/widget-config?shop=${shopDomain}`)
      .then(res => res.json())
      .then(data => {
        setConfig(data.config);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load widget config:', err);
        // Use defaults
        setConfig({
          primaryColor: '#2563EB',
          position: 'bottom-right',
          welcomeMessage: 'Hi! How can I help you today?',
          botName: 'Support Assistant',
        });
        setIsLoading(false);
      });
  }, []);

  if (isLoading || !config) {
    return null;
  }

  const positionStyles = config.position === 'bottom-right'
    ? { bottom: '20px', right: '20px' }
    : { bottom: '20px', left: '20px' };

  return (
    <div className="shopify-chat-widget" style={positionStyles}>
      {isOpen && (
        <ChatWindow
          merchantId={merchantId}
          appUrl={appUrl}
          config={config}
          onClose={() => setIsOpen(false)}
        />
      )}

      {!isOpen && (
        <button
          className="chat-fab"
          onClick={() => setIsOpen(true)}
          style={{ backgroundColor: config.primaryColor }}
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="white"/>
          </svg>
        </button>
      )}
    </div>
  );
}

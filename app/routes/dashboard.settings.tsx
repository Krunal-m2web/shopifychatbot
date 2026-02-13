/**
 * Dashboard Settings Page
 * Merchant configuration for chat widget, AI, and RAG
 */

import {
  Page,
  Card,
  Layout,
  TextField,
  Button,
  BlockStack,
  Text,
  Select,
  RangeSlider,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { useEffect, useState } from "react";

interface Settings {
  chatWidget: {
    primaryColor: string;
    secondaryColor?: string;
    borderRadius?: number;
    position: string;
    welcomeMessage: string;
    avatarUrl?: string;
    customIcon?: string;
    customCss?: string;
  };
  aiConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  ragSettings: {
    embeddingModel: string;
    chunkSize: number;
  };
}

function WidgetPreview({ settings }: { settings: Settings["chatWidget"] }) {
  const styles = {
    "--chat-primary-color": settings.primaryColor,
    "--chat-secondary-color": settings.secondaryColor || settings.primaryColor,
    "--chat-border-radius": `${settings.borderRadius || 12}px`,
  } as React.CSSProperties;

  return (
    <div style={{
      ...styles,
      width: "100%",
      height: "400px",
      border: "1px solid var(--p-color-border-muted)",
      borderRadius: "8px",
      backgroundColor: "#f4f6f8",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        width: "280px",
        height: "360px",
        backgroundColor: "#fff",
        borderRadius: "var(--chat-border-radius)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, var(--chat-primary-color), var(--chat-secondary-color))`,
          padding: "12px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
             {settings.avatarUrl ? <img src={settings.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🤖"}
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>AI Assistant</div>
            <div style={{ fontSize: "10px", opacity: 0.9 }}>Online</div>
          </div>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ alignSelf: "flex-start", backgroundColor: "#f1f3f5", padding: "8px 12px", borderRadius: "var(--chat-border-radius)", borderBottomLeftRadius: "4px", fontSize: "12px", maxWidth: "80%" }}>
            {settings.welcomeMessage}
          </div>
          <div style={{ alignSelf: "flex-end", backgroundColor: "var(--chat-primary-color)", color: "#fff", padding: "8px 12px", borderRadius: "var(--chat-border-radius)", borderBottomRightRadius: "4px", fontSize: "12px", maxWidth: "80%" }}>
            Testing out the colors!
          </div>
        </div>
        {/* Input */}
        <div style={{ padding: "12px", borderTop: "1px solid #eee", display: "flex", gap: "8px" }}>
           <div style={{ flex: 1, height: "30px", borderRadius: "15px", border: "1px solid #ddd" }}></div>
           <div style={{ width: "30px", height: "30px", borderRadius: "50%", backgroundColor: "var(--chat-primary-color)" }}></div>
        </div>
      </div>
      
      {/* Custom Styles Injection (Simulation) */}
      {settings.customCss && <style>{settings.customCss}</style>}
    </div>
  );
}

export default function DashboardSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Last synced: Never");

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage("Syncing...");
      const response = await fetch("/api/dashboard/sync", { method: "POST" });
      const result = await response.json();
      
      if (result.success) {
        setSyncMessage(`Last synced: ${new Date().toLocaleTimeString()}`);
      } else {
        setSyncMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/settings?merchantId=1");
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setSaveSuccess(false);

      const response = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: 1,
          ...settings,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <Text as="p">Loading settings...</Text>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Settings"
      subtitle="Configure your chatbot's appearance and behavior"
      primaryAction={{
        content: "Save Changes",
        onAction: handleSave,
        loading: saving,
      }}
    >
      <Layout>
        {saveSuccess && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSaveSuccess(false)}>
              Settings saved successfully!
            </Banner>
          </Layout.Section>
        )}

        {/* Chat Widget Settings */}
        <Layout.Section>
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">
                    Appearance
                  </Text>

                  <InlineStack gap="400">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Primary Color"
                        value={settings.chatWidget.primaryColor}
                        onChange={(value) =>
                          setSettings({
                            ...settings,
                            chatWidget: { ...settings.chatWidget, primaryColor: value },
                          })
                        }
                        placeholder="#5C6AC4"
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Secondary Color (Gradient)"
                        value={settings.chatWidget.secondaryColor || ""}
                        onChange={(value) =>
                          setSettings({
                            ...settings,
                            chatWidget: { ...settings.chatWidget, secondaryColor: value },
                          })
                        }
                        placeholder="#2E5C8A"
                        autoComplete="off"
                      />
                    </div>
                  </InlineStack>

                  <RangeSlider
                    label={`Border Radius: ${settings.chatWidget.borderRadius || 12}px`}
                    value={settings.chatWidget.borderRadius || 12}
                    onChange={(value) => {
                      const val = Array.isArray(value) ? value[0] : value;
                      setSettings({
                        ...settings,
                        chatWidget: { ...settings.chatWidget, borderRadius: val },
                      });
                    }}
                    min={0}
                    max={40}
                    step={2}
                    output
                  />

                  <TextField
                    label="Avatar URL"
                    value={settings.chatWidget.avatarUrl || ""}
                    onChange={(value) =>
                      setSettings({
                        ...settings,
                        chatWidget: { ...settings.chatWidget, avatarUrl: value },
                      })
                    }
                    placeholder="https://example.com/avatar.png"
                    helpText="Must be a direct image link"
                    autoComplete="off"
                  />

                  <Select
                    label="Widget Position"
                    options={[
                      { label: "Bottom Right", value: "bottom-right" },
                      { label: "Bottom Left", value: "bottom-left" },
                      { label: "Top Right", value: "top-right" },
                      { label: "Top Left", value: "top-left" },
                    ]}
                    value={settings.chatWidget.position}
                    onChange={(value) =>
                      setSettings({
                        ...settings,
                        chatWidget: { ...settings.chatWidget, position: value },
                      })
                    }
                  />

                  <TextField
                    label="Welcome Message"
                    value={settings.chatWidget.welcomeMessage}
                    onChange={(value) =>
                      setSettings({
                        ...settings,
                        chatWidget: { ...settings.chatWidget, welcomeMessage: value },
                      })
                    }
                    placeholder="Hi! How can we help you today?"
                    maxLength={200}
                    showCharacterCount
                    autoComplete="off"
                    multiline={2}
                  />

                  <TextField
                    label="Custom CSS (Advanced)"
                    value={settings.chatWidget.customCss || ""}
                    onChange={(value) =>
                      setSettings({
                        ...settings,
                        chatWidget: { ...settings.chatWidget, customCss: value },
                      })
                    }
                    placeholder=".chat-header { font-family: 'Serif'; }"
                    autoComplete="off"
                    multiline={4}
                    helpText="Override widget styles with custom CSS"
                  />
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Live Preview
                  </Text>
                  <WidgetPreview settings={settings.chatWidget} />
                  <div style={{ textAlign: "center" }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      This is how the widget will look on your store
                    </Text>
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* AI Configuration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                AI Model Configuration
              </Text>

              <Select
                label="AI Model"
                options={[
                  { label: "Claude 3.5 Sonnet (Recommended)", value: "claude-3-5-sonnet" },
                  { label: "Claude 3 Opus", value: "claude-3-opus" },
                  { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
                  { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
                  { label: "GPT-4", value: "gpt-4" },
                  { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
                ]}
                value={settings.aiConfig.model}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    aiConfig: { ...settings.aiConfig, model: value },
                  })
                }
              />

              <RangeSlider
                label={`Temperature: ${settings.aiConfig.temperature}`}
                value={settings.aiConfig.temperature}
                onChange={(value) => {
                  const temp = Array.isArray(value) ? value[0] : value;
                  setSettings({
                    ...settings,
                    aiConfig: { ...settings.aiConfig, temperature: temp },
                  });
                }}
                min={0}
                max={1}
                step={0.1}
                output
                helpText="Lower = more focused, Higher = more creative"
              />

              <TextField
                label="Max Tokens"
                type="number"
                value={settings.aiConfig.maxTokens.toString()}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    aiConfig: { ...settings.aiConfig, maxTokens: parseInt(value) || 500 },
                  })
                }
                min={100}
                max={4000}
                helpText="Maximum response length (100-4000)"
                autoComplete="off"
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* RAG Settings */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Knowledge Base (RAG) Settings
              </Text>

              <Select
                label="Embedding Model"
                options={[
                  { label: "OpenAI text-embedding-3-small", value: "text-embedding-3-small" },
                  { label: "OpenAI text-embedding-3-large", value: "text-embedding-3-large" },
                  { label: "OpenAI ada-002", value: "text-embedding-ada-002" },
                ]}
                value={settings.ragSettings.embeddingModel}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    ragSettings: { ...settings.ragSettings, embeddingModel: value },
                  })
                }
              />

              <TextField
                label="Chunk Size"
                type="number"
                value={settings.ragSettings.chunkSize.toString()}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    ragSettings: {
                      ...settings.ragSettings,
                      chunkSize: parseInt(value) || 500,
                    },
                  })
                }
                min={100}
                max={2000}
                helpText="Text chunk size for embeddings (100-2000)"
                autoComplete="off"
              />

              <InlineStack gap="200">
                <Button loading={syncing} onClick={handleSync}>
                  Sync Products & Embeddings
                </Button>
                <Text as="p" variant="bodySm" tone="subdued">
                  {syncMessage}
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

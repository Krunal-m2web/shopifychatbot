/**
 * Dashboard Layout Component
 * Main dashboard frame with navigation and header
 */

import { Frame, Navigation, TopBar } from "@shopify/polaris";
import { HomeIcon, ChatIcon, CodeIcon, SettingsIcon } from "@shopify/polaris-icons";
import { useState } from "react";
import { Outlet, useLocation, useNavigate, useLoaderData } from "react-router";
import { PolarisProvider } from "~/components/PolarisProvider";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: any) => {
  await authenticate.admin(request);
  return null;
};

export default function DashboardLayout() {
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMobileNavigation = () => {
    setMobileNavigationActive((prev) => !prev);
  };

  // Top bar with merchant info
  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigation}
    />
  );

  // Determine active navigation item
  const getSelectedItem = () => {
    if (location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/analytics")) {
      return "/dashboard/analytics";
    }
    if (location.pathname.startsWith("/dashboard/conversations")) {
      return "/dashboard/conversations";
    }
    if (location.pathname.startsWith("/dashboard/test-chat")) {
      return "/dashboard/test-chat";
    }
    if (location.pathname.startsWith("/dashboard/settings")) {
      return "/dashboard/settings";
    }
    return "/dashboard/analytics";
  };

  // Navigation sidebar
  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={[
          {
            label: "Analytics",
            icon: HomeIcon,
            url: "/dashboard/analytics",
            selected: getSelectedItem() === "/dashboard/analytics",
            onClick: () => navigate("/dashboard/analytics"),
          },
          {
            label: "Conversations",
            icon: ChatIcon,
            url: "/dashboard/conversations",
            selected: getSelectedItem() === "/dashboard/conversations",
            onClick: () => navigate("/dashboard/conversations"),
          },
          {
            label: "Test Chat",
            icon: CodeIcon,
            url: "/dashboard/test-chat",
            selected: getSelectedItem() === "/dashboard/test-chat",
            onClick: () => navigate("/dashboard/test-chat"),
          },
          {
            label: "Settings",
            icon: SettingsIcon,
            url: "/dashboard/settings",
            selected: getSelectedItem() === "/dashboard/settings",
            onClick: () => navigate("/dashboard/settings"),
          },
        ]}
      />
    </Navigation>
  );

  return (
    <PolarisProvider>
      <Frame
        topBar={topBarMarkup}
        navigation={navigationMarkup}
        showMobileNavigation={mobileNavigationActive}
        onNavigationDismiss={toggleMobileNavigation}
      >
        <Outlet />
      </Frame>
    </PolarisProvider>
  );
}

import type { Config } from "@react-router/dev/config";

export default {
  // App configuration
  appDirectory: "app",

  // Server bundle configuration
  serverBundles: ({ branch }) => {
    return branch.some((route) => route.id === "routes/admin")
      ? "admin"
      : "default";
  },
} satisfies Config;

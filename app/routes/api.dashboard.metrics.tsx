/**
* Dashboard Metrics API
 * Returns aggregated metrics for the merchant dashboard
 */

import type { Route } from "./+types/api.dashboard.metrics";
import { getMetricsForRange } from "~/services/analytics-aggregator.server";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "7d"; // 1d, 7d, 30d
    const merchantId = parseInt(url.searchParams.get("merchantId") || "1");

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "1d":
        startDate.setDate(endDate.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Get metrics for the range
    const metricsData = await getMetricsForRange(merchantId, startDateStr, endDateStr);

    // Aggregate totals
    const totalConversations = metricsData.reduce((sum, m) => sum + m.totalConversations, 0);
    const totalResolved = metricsData.reduce((sum, m) => sum + m.resolvedConversations, 0);
    const avgResponseTime =
      metricsData.length > 0
        ? Math.round(
            metricsData.reduce((sum, m) => sum + m.avgResponseTimeMs, 0) / metricsData.length
          )
        : 0;

    const resolutionRate =
      totalConversations > 0 ? (totalResolved / totalConversations).toFixed(2) : "0.00";

    // Combine top products across all days
    const productMap = new Map<string, number>();
    metricsData.forEach((m) => {
      m.topProducts.forEach((p) => {
        productMap.set(p.product, (productMap.get(p.product) || 0) + p.count);
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([product, count]) => ({ product, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Prepare trend data for charts (daily breakdown)
    const trend = {
      daily: metricsData.map((m) => ({
        date: m.metricDate,
        conversations: m.totalConversations,
        resolved: m.resolvedConversations,
        avgResponseTime: m.avgResponseTimeMs,
        messages: m.totalMessages,
      })),
    };

    return Response.json({
      metrics: {
        totalConversations,
        avgResponseTime: `${(avgResponseTime / 1000).toFixed(1)}s`,
        resolutionRate: parseFloat(resolutionRate),
        topProducts,
        trend,
      },
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dashboard metrics error:", error);
    return Response.json(
      { error: "Failed to fetch metrics", details: error.message },
      { status: 500 }
    );
  }
}

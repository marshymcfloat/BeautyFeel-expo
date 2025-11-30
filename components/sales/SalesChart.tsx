import type { SalesData } from "@/lib/actions/salesActions";
import { formatCurrencyCompact } from "@/lib/utils/currency";
import React, { useMemo } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Text as SvgText,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48; // Account for padding
const CHART_HEIGHT = 200;
const PADDING = 40;

interface SalesChartProps {
  data: SalesData[];
  timeSpan: "all" | "month" | "week" | "day";
}

export default function SalesChart({ data, timeSpan }: SalesChartProps) {
  // Memoize expensive calculations
  const chartCalculations = useMemo(() => {
    if (!data || data.length === 0) return null;

    const chartWidth = CHART_WIDTH - PADDING * 2;
    const chartHeight = CHART_HEIGHT - PADDING * 2;

    // Find max sales value for scaling
    const maxSales = Math.max(...data.map((d) => d.sales), 1);
    const minSales = Math.min(...data.map((d) => d.sales), 0);

    // Calculate points for the line
    const points = data.map((item, index) => {
      const divisor = data.length > 1 ? data.length - 1 : 1;
      const x = (index / divisor) * chartWidth + PADDING;
      const salesRange = maxSales - minSales || 1;
      const y =
        chartHeight -
        ((item.sales - minSales) / salesRange) * chartHeight +
        PADDING;
      return { x, y, sales: item.sales, date: item.date };
    });

    return { points, maxSales, minSales, chartWidth, chartHeight };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sales data available</Text>
        <Text style={styles.emptySubtext}>
          Sales data will appear here once you have completed or paid bookings
        </Text>
      </View>
    );
  }

  if (!chartCalculations) return null;

  const { points, maxSales, minSales, chartWidth, chartHeight } =
    chartCalculations;

  // Format date labels based on time span
  const formatDateLabel = (dateStr: string) => {
    if (timeSpan === "day") {
      // Show hour
      return dateStr.split(" ")[1]?.substring(0, 5) || dateStr;
    } else if (timeSpan === "week" || timeSpan === "month") {
      // Show day/month
      const parts = dateStr.split("-");
      return `${parts[2]}/${parts[1]}`;
    } else {
      // Show month/year (for "all" time span, dateStr is YYYY-MM format)
      const parts = dateStr.split("-");
      if (parts.length >= 2) {
        const month = parts[1];
        const year = parts[0]?.substring(2) || "";
        return `${month}/${year}`;
      }
      return dateStr;
    }
  };

  // Generate Y-axis labels
  const yAxisLabels = [];
  const numLabels = 5;
  for (let i = 0; i <= numLabels; i++) {
    const value = minSales + ((maxSales - minSales) * i) / numLabels;
    yAxisLabels.push(value);
  }

  return (
    <View style={styles.container}>
      {data.length === 1 && (
        <View style={styles.singlePointNotice}>
          <Text style={styles.singlePointText}>
            All sales are in the same month. Switch to &quot;Month&quot;,
            &quot;Week&quot;, or &quot;Today&quot; to see more detailed trends.
          </Text>
        </View>
      )}
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Y-axis grid lines and labels */}
        {yAxisLabels.map((value, index) => {
          const y =
            chartHeight -
            ((value - minSales) / (maxSales - minSales || 1)) * chartHeight +
            PADDING;
          return (
            <G key={`y-${index}`}>
              <Line
                x1={PADDING}
                y1={y}
                x2={CHART_WIDTH - PADDING}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <SvgText
                x={PADDING - 10}
                y={y + 4}
                fontSize="10"
                fill="#6b7280"
                textAnchor="end"
              >
                {value >= 1000
                  ? formatCurrencyCompact(value / 1000) + "k"
                  : formatCurrencyCompact(value)}
              </SvgText>
            </G>
          );
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          const divisor = data.length > 1 ? data.length - 1 : 1;
          const step = Math.max(1, Math.ceil(data.length / 5));
          if (index % step !== 0 && index !== data.length - 1) {
            return null;
          }
          const x = (index / divisor) * chartWidth + PADDING;
          return (
            <SvgText
              key={`x-${index}`}
              x={x}
              y={CHART_HEIGHT - 10}
              fontSize="10"
              fill="#6b7280"
              textAnchor="middle"
            >
              {formatDateLabel(item.date)}
            </SvgText>
          );
        })}

        {/* Sales line - only render if we have more than one point */}
        {points.length > 1 && (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#ec4899"
            strokeWidth="2"
          />
        )}

        {/* Data points */}
        {points.map((point, index) => (
          <G key={`point-${index}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#ec4899"
              stroke="white"
              strokeWidth="2"
            />
            {/* Show value label for single data point */}
            {points.length === 1 && (
              <SvgText
                x={point.x}
                y={point.y - 15}
                fontSize="12"
                fill="#ec4899"
                fontWeight="bold"
                textAnchor="middle"
              >
                {point.sales >= 1000
                  ? formatCurrencyCompact(point.sales / 1000) + "k"
                  : formatCurrencyCompact(Math.round(point.sales))}
              </SvgText>
            )}
          </G>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#9ca3af",
    fontSize: 12,
    textAlign: "center",
  },
  singlePointNotice: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  singlePointText: {
    color: "#92400e",
    fontSize: 12,
    textAlign: "center",
  },
});

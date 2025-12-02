import type { SalesData } from "@/lib/actions/salesActions";
import { formatCurrencyCompact } from "@/lib/utils/currency";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

const CHART_HEIGHT = scaleDimension(220);
const PADDING_TOP = scaleDimension(40);
const PADDING_BOTTOM = scaleDimension(30);
const PADDING_LEFT = scaleDimension(16);
const PADDING_RIGHT = scaleDimension(16);

// Helper for smooth curve
const bezierCommand = (point: any, i: number, a: any) => {
  const { x: xEnd, y: yEnd } = point;
  const { x: xStart, y: yStart } = a[i - 1] || point;
  const smoothing = 0.2;
  const cpsX = xStart + (xEnd - xStart) * smoothing;
  const cpsY = yStart;
  const cpeX = xEnd - (xEnd - xStart) * smoothing;
  const cpeY = yEnd;
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${xEnd},${yEnd}`;
};

interface SalesChartProps {
  data: SalesData[];
  timeSpan: "all" | "month" | "week" | "day";
}

export default function SalesChart({ data, timeSpan }: SalesChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const chartCalculations = useMemo(() => {
    if (!data || data.length === 0 || containerWidth === 0) return null;

    // Ensure we draw strictly inside the container
    const chartWidth = containerWidth - PADDING_LEFT - PADDING_RIGHT;
    const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    // Find max sales value for scaling
    let maxSales = Math.max(...data.map((d) => d.sales), 1);
    const minSales = 0; // Always start from 0 for better context

    // Add 10% buffer to top so the line doesn't hit the ceiling
    maxSales = maxSales * 1.1;

    // Calculate points
    const points = data.map((item, index) => {
      const divisor = data.length > 1 ? data.length - 1 : 1;
      const x = (index / divisor) * chartWidth + PADDING_LEFT;
      const salesRange = maxSales - minSales || 1;
      const y =
        CHART_HEIGHT -
        PADDING_BOTTOM -
        ((item.sales - minSales) / salesRange) * chartHeight;
      return { x, y, sales: item.sales, date: item.date };
    });

    // Generate Path for smooth line
    const d = points.reduce(
      (acc, point, i, a) =>
        i === 0
          ? `M ${point.x},${point.y}`
          : `${acc} ${bezierCommand(point, i, a)}`,
      ""
    );

    // Generate Path for Gradient Area
    const dArea = `${d} L ${points[points.length - 1].x},${
      CHART_HEIGHT - PADDING_BOTTOM
    } L ${points[0].x},${CHART_HEIGHT - PADDING_BOTTOM} Z`;

    return { points, maxSales, minSales, chartHeight, d, dArea };
  }, [data, containerWidth]);

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

  // Format date labels
  const formatDateLabel = (dateStr: string) => {
    if (timeSpan === "day")
      return dateStr.split(" ")[1]?.substring(0, 5) || dateStr;
    if (timeSpan === "week" || timeSpan === "month") {
      const parts = dateStr.split("-");
      return `${parts[1]}/${parts[2]}`;
    }
    const parts = dateStr.split("-");
    if (parts.length >= 2) return `${parts[1]}/${parts[0]?.substring(2)}`;
    return dateStr;
  };

  const handleTouch = (index: number) => {
    setSelectedIndex(index === selectedIndex ? null : index);
  };

  // If chart isn't ready (width not measured), render a placeholder
  if (!chartCalculations) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        {/* Invisible spacer to reserve height */}
        <View style={{ height: CHART_HEIGHT }} />
      </View>
    );
  }

  const { points, chartHeight, d, dArea } = chartCalculations;
  const activePointIndex =
    selectedIndex !== null ? selectedIndex : points.length - 1;
  const activePoint = points[activePointIndex];

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Header Info */}
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.activeLabel}>
            {activePoint ? formatDateLabel(activePoint.date) : "Total Sales"}
          </Text>
          <Text style={styles.activeValue}>
            {activePoint ? formatCurrencyCompact(activePoint.sales) : "₱0"}
          </Text>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={containerWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ec4899" stopOpacity="0.2" />
              <Stop offset="1" stopColor="#ec4899" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid Lines (Horizontal) */}
          {[0, 0.5, 1].map((t) => {
            const y = CHART_HEIGHT - PADDING_BOTTOM - t * chartHeight;
            return (
              <Line
                key={t}
                x1={PADDING_LEFT}
                y1={y}
                x2={containerWidth - PADDING_RIGHT}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            );
          })}

          {/* X-axis Labels */}
          {points.map((point, index) => {
            // Show fewer labels to prevent overlap
            const step = Math.max(1, Math.ceil(points.length / 5));
            if (index % step !== 0 && index !== points.length - 1) return null;

            return (
              <SvgText
                key={index}
                x={point.x}
                y={CHART_HEIGHT - 10}
                fontSize={scaleFont(10)}
                fill="#9ca3af"
                textAnchor="middle"
              >
                {formatDateLabel(point.date)}
              </SvgText>
            );
          })}

          {/* Area Fill */}
          {points.length > 1 && <Path d={dArea} fill="url(#gradient)" />}

          {/* Line Path */}
          {points.length > 1 && (
            <Path d={d} fill="none" stroke="#ec4899" strokeWidth="3" />
          )}

          {/* Interactive Overlay & Dots */}
          {points.map((point, index) => (
            <G key={index} onPress={() => handleTouch(index)}>
              {/* Invisible large rect for easier tapping */}
              <Rect
                x={point.x - 15}
                y={0}
                width={30}
                height={CHART_HEIGHT}
                fill="transparent"
                onPress={() => handleTouch(index)}
              />

              {/* Active Point Indicator */}
              {activePointIndex === index && (
                <G>
                  {/* Vertical Indicator Line */}
                  <Line
                    x1={point.x}
                    y1={PADDING_TOP}
                    x2={point.x}
                    y2={CHART_HEIGHT - PADDING_BOTTOM}
                    stroke="#ec4899"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity={0.5}
                  />
                  {/* Outer Glow Circle */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill="#ec4899"
                    opacity={0.2}
                  />
                  {/* Inner Solid Circle */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#ec4899"
                    stroke="white"
                    strokeWidth="2"
                  />
                </G>
              )}
            </G>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: scaleDimension(24),
    padding: scaleDimension(16),
    marginHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
    // Ensure content stays inside
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartWrapper: {
    // This wrapper ensures the SVG doesn't bleed out if calculations are off
    overflow: "hidden",
  },
  chartHeader: {
    marginBottom: scaleDimension(8),
    paddingLeft: scaleDimension(8),
  },
  activeLabel: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: scaleDimension(2),
  },
  activeValue: {
    fontSize: scaleFont(24),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  emptyContainer: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(40),
    marginHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  emptyText: {
    color: "#374151",
    fontSize: scaleFont(14),
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  emptySubtext: {
    color: "#9ca3af",
    fontSize: scaleFont(12),
    textAlign: "center",
  },
});

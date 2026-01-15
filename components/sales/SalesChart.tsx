import type {
  Branch,
  SalesData,
  SalesDataByBranch,
} from "@/lib/actions/salesActions";
import { getBranchesForOwner } from "@/lib/actions/salesActions";
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

// Color scheme for branches
const BRANCH_COLORS: Record<Branch, string> = {
  NAILS: "#ec4899", // Pink
  SKIN: "#8b5cf6", // Purple
  LASHES: "#10b981", // Green
  MASSAGE: "#f59e0b", // Amber/Orange
};

const BRANCH_LABELS: Record<Branch, string> = {
  NAILS: "Nails",
  SKIN: "Skin",
  LASHES: "Lashes",
  MASSAGE: "Massage",
};

const CHART_HEIGHT = scaleDimension(240);
const PADDING_TOP = scaleDimension(50);
const PADDING_BOTTOM = scaleDimension(40);
const PADDING_LEFT = scaleDimension(0); // Minimized for full-width look
const PADDING_RIGHT = scaleDimension(0);

// Helper for smooth curve
const bezierCommand = (point: any, i: number, a: any) => {
  const { x: xEnd, y: yEnd } = point;
  const { x: xStart, y: yStart } = a[i - 1] || point;
  const smoothing = 0.15; // Adjusted for a tighter curve like the screenshot
  const cpsX = xStart + (xEnd - xStart) * smoothing;
  const cpsY = yStart;
  const cpeX = xEnd - (xEnd - xStart) * smoothing;
  const cpeY = yEnd;
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${xEnd},${yEnd}`;
};

interface SalesChartProps {
  data: SalesData[];
  dataByBranch?: SalesDataByBranch[];
  timeSpan: "all" | "month" | "week" | "day";
  ownerBranch?: Branch | null;
}

export default function SalesChart({
  data,
  dataByBranch,
  timeSpan,
  ownerBranch,
}: SalesChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  // Get branches that have sales data (at least one data point with sales > 0)
  // Filter to only show branches the owner has access to
  const activeBranches = useMemo(() => {
    if (!dataByBranch || dataByBranch.length === 0) return [];

    // Get accessible branches for this owner
    const accessibleBranches =
      ownerBranch !== undefined && ownerBranch !== null
        ? getBranchesForOwner(ownerBranch)
        : ["NAILS", "SKIN", "LASHES", "MASSAGE"];

    const branches = new Set<Branch>();
    dataByBranch.forEach((item) => {
      Object.entries(item.branches).forEach(([branch, branchData]) => {
        // Only include branches that:
        // 1. The owner has access to
        // 2. Have sales > 0 in at least one data point
        if (
          accessibleBranches.includes(branch as Branch) &&
          branchData &&
          branchData.sales > 0
        ) {
          branches.add(branch as Branch);
        }
      });
    });
    return Array.from(branches);
  }, [dataByBranch, ownerBranch]);

  const chartCalculations = useMemo(() => {
    // Always prefer dataByBranch if available
    const chartData =
      dataByBranch && dataByBranch.length > 0 ? dataByBranch : null;

    // If we have branch data, use multi-branch chart
    if (chartData && chartData.length > 0 && containerWidth > 0) {
      const internalPaddingX = scaleDimension(16);
      const chartWidth = containerWidth - internalPaddingX * 2;
      const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

      // Calculate max sales across all branches
      let maxSales = 0;
      chartData.forEach((item) => {
        Object.values(item.branches).forEach((branchData) => {
          maxSales = Math.max(maxSales, branchData.sales);
        });
      });
      maxSales = Math.max(maxSales, 1);
      const minSales = 0;
      maxSales = maxSales * 1.2; // Add 20% breathing room at top

      // Generate points for each branch
      const branchLines: Array<{
        branch: Branch;
        color: string;
        points: Array<{ x: number; y: number; sales: number }>;
      }> = [];

      activeBranches.forEach((branch) => {
        const points = chartData.map((item, index) => {
          const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
          const x = (index / divisor) * chartWidth + internalPaddingX;
          const sales = item.branches[branch].sales;
          const salesRange = maxSales - minSales || 1;
          const y =
            CHART_HEIGHT -
            PADDING_BOTTOM -
            ((sales - minSales) / salesRange) * chartHeight;
          return { x, y, sales };
        });
        branchLines.push({ branch, color: BRANCH_COLORS[branch], points });
      });

      // Generate path strings for each branch
      const lines = branchLines.map(({ branch, color, points }) => {
        const d = points.reduce(
          (acc, point, i, a) =>
            i === 0
              ? `M ${point.x},${point.y}`
              : `${acc} ${bezierCommand(point, i, a)}`,
          ""
        );

        // Area paths for gradients (optional, can remove if too cluttered)
        const dArea = `${d} L ${points[points.length - 1].x},${
          CHART_HEIGHT - PADDING_BOTTOM
        } L ${points[0].x},${CHART_HEIGHT - PADDING_BOTTOM} Z`;

        return { branch, color, d, dArea, points };
      });

      // Combined points for interactivity (use first date from chartData)
      const points = chartData.map((item, index) => {
        const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
        const x = (index / divisor) * chartWidth + internalPaddingX;
        const totalSales = Object.values(item.branches).reduce(
          (sum, b) => sum + b.sales,
          0
        );
        return {
          x,
          y: 0, // Will be calculated per branch
          sales: totalSales,
          date: item.date,
          branches: item.branches,
        };
      });

      return { points, chartHeight, lines, maxSales };
    }

    // Fallback to old single line chart only if no branch data
    if (!data || data.length === 0 || containerWidth === 0) return null;

    const internalPaddingX = scaleDimension(16);
    const chartWidth = containerWidth - internalPaddingX * 2;
    const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    let maxSales = Math.max(...data.map((d) => d.sales), 1);
    const minSales = 0;
    maxSales = maxSales * 1.2;

    const points = data.map((item, index) => {
      const divisor = data.length > 1 ? data.length - 1 : 1;
      const x = (index / divisor) * chartWidth + internalPaddingX;
      const salesRange = maxSales - minSales || 1;
      const y =
        CHART_HEIGHT -
        PADDING_BOTTOM -
        ((item.sales - minSales) / salesRange) * chartHeight;
      return { x, y, sales: item.sales, date: item.date, branches: {} };
    });

    const d = points.reduce(
      (acc, point, i, a) =>
        i === 0
          ? `M ${point.x},${point.y}`
          : `${acc} ${bezierCommand(point, i, a)}`,
      ""
    );

    const dArea = `${d} L ${points[points.length - 1].x},${
      CHART_HEIGHT - PADDING_BOTTOM
    } L ${points[0].x},${CHART_HEIGHT - PADDING_BOTTOM} Z`;

    return {
      points: points.map((p) => ({
        ...p,
        branches: {} as Record<Branch, { sales: number; bookings: number }>,
      })),
      chartHeight,
      lines: [
        { d, dArea, branch: null as Branch | null, color: "#ec4899", points },
      ],
      maxSales: maxSales,
    };
  }, [data, dataByBranch, containerWidth, activeBranches]);

  // Format date labels
  const formatDateLabel = (dateStr: string) => {
    if (timeSpan === "day")
      return dateStr.split(" ")[1]?.substring(0, 5) || dateStr;
    const parts = dateStr.split("-");
    if (parts.length >= 2) return `${parts[1]}/${parts[2]}`;
    return dateStr;
  };

  const handleTouch = (index: number) => {
    setSelectedIndex(index === selectedIndex ? null : index);
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sales data available</Text>
        </View>
      </View>
    );
  }

  // Placeholder while measuring
  if (!chartCalculations) {
    return (
      <View style={styles.card} onLayout={onLayout}>
        <View style={{ height: CHART_HEIGHT }} />
      </View>
    );
  }

  const { points, chartHeight, lines } = chartCalculations;
  const activePointIndex =
    selectedIndex !== null ? selectedIndex : points.length - 1;
  const activePoint = points[activePointIndex];

  // Calculate total sales for active point
  const activeTotalSales =
    activePoint?.branches && Object.keys(activePoint.branches).length > 0
      ? Object.values(activePoint.branches).reduce(
          (sum: number, b: any) => sum + (b.sales || 0),
          0
        )
      : activePoint?.sales || 0;

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={styles.chartHeader}>
        <Text style={styles.activeLabel}>
          {activePoint ? formatDateLabel(activePoint.date) : "Total"}
        </Text>
        <Text style={styles.activeValue}>
          {formatCurrencyCompact(activeTotalSales)}
        </Text>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={containerWidth} height={CHART_HEIGHT}>
          <Defs>
            {/* Fallback gradient for single line (when no branch data) */}
            <LinearGradient id="gradient-fallback" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ec4899" stopOpacity="0.15" />
              <Stop offset="1" stopColor="#ec4899" stopOpacity="0" />
            </LinearGradient>
            {/* Gradients for each branch */}
            {lines
              .filter((line) => line.branch !== null)
              .map((line) => (
                <LinearGradient
                  key={`gradient-${line.branch}`}
                  id={`gradient-${line.branch}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={line.color} stopOpacity="0.15" />
                  <Stop offset="1" stopColor={line.color} stopOpacity="0" />
                </LinearGradient>
              ))}
          </Defs>

          {/* Dotted Horizontal Grid Lines */}
          {[0, 0.33, 0.66, 1].map((t) => {
            const y = CHART_HEIGHT - PADDING_BOTTOM - t * chartHeight;
            return (
              <Line
                key={t}
                x1={16}
                y1={y}
                x2={containerWidth - 16}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
                strokeDasharray="6,6"
              />
            );
          })}

          {/* Lines for each branch (no areas to avoid overlap) */}
          {lines.map((line, lineIndex) => (
            <G key={line.branch || `line-${lineIndex}`}>
              {/* Line */}
              {line.points.length > 1 && (
                <Path
                  d={line.d}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
            </G>
          ))}

          {/* Interactive Elements */}
          {points.map((point, index) => (
            <G key={index} onPress={() => handleTouch(index)}>
              <Rect
                x={point.x - 20}
                y={0}
                width={40}
                height={CHART_HEIGHT}
                fill="transparent"
              />
              {activePointIndex === index && (
                <G>
                  <Line
                    x1={point.x}
                    y1={PADDING_TOP}
                    x2={point.x}
                    y2={CHART_HEIGHT - PADDING_BOTTOM}
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity={0.6}
                  />
                  {/* Show circles for each branch at this point */}
                  {lines.map((line, lineIdx) => {
                    const branchPoint = line.points[index];
                    if (!branchPoint || branchPoint.sales === 0) return null;
                    return (
                      <Circle
                        key={line.branch || `circle-${lineIdx}`}
                        cx={branchPoint.x}
                        cy={branchPoint.y}
                        r="6"
                        fill={line.color}
                        stroke="white"
                        strokeWidth="2.5"
                      />
                    );
                  })}
                </G>
              )}
            </G>
          ))}

          {/* X Axis Labels */}
          {points.map((point, index) => {
            // Show start and end labels, and maybe one in middle
            const shouldShow =
              index === 0 ||
              index === points.length - 1 ||
              index === Math.floor(points.length / 2);
            if (!shouldShow) return null;

            return (
              <SvgText
                key={index}
                x={point.x}
                y={CHART_HEIGHT - 12}
                fontSize={scaleFont(11)}
                fill="#9ca3af"
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                    ? "end"
                    : "middle"
                }
                fontWeight="500"
              >
                {formatDateLabel(point.date)}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      {activeBranches.length > 0 && (
        <View style={styles.legend}>
          {activeBranches.map((branch) => (
            <View key={branch} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: BRANCH_COLORS[branch] },
                ]}
              />
              <Text style={styles.legendLabel}>{BRANCH_LABELS[branch]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: scaleDimension(24),
    padding: scaleDimension(20),
    width: "100%", // Ensures it fills parent
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899", // Slight pink shadow for premium feel
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartHeader: {
    marginBottom: scaleDimension(8),
  },
  activeLabel: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: scaleDimension(4),
  },
  activeValue: {
    fontSize: scaleFont(26),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  chartWrapper: {
    overflow: "hidden",
    marginLeft: scaleDimension(-16), // Negative margin to let SVG hit the edges visually if needed
    marginRight: scaleDimension(-16),
  },
  emptyContainer: {
    height: scaleDimension(200),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: scaleFont(14),
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: scaleDimension(16),
    gap: scaleDimension(12),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
  },
  legendColor: {
    width: scaleDimension(12),
    height: scaleDimension(12),
    borderRadius: scaleDimension(2),
  },
  legendLabel: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "600",
  },
});

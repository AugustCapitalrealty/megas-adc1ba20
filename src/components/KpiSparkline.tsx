import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KpiSparklineProps {
  data: number[];
  color?: string;
}

/**
 * Tiny sparkline (40×20px) for KPI trend visualization.
 * Expects an array of 7 numbers (last 7 days).
 */
export function KpiSparkline({ data, color = 'hsl(var(--primary))' }: KpiSparklineProps) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className="w-10 h-5 opacity-70">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

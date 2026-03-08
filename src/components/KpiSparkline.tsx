import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiSparklineProps {
  data: number[];
  color?: string;
}

/**
 * Sparkline (60×24px) for KPI trend visualization with trend arrow.
 * Expects an array of 7 numbers (last 7 days).
 */
export function KpiSparkline({ data, color = 'hsl(var(--primary))' }: KpiSparklineProps) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ value, index }));
  const first = data[0];
  const last = data[data.length - 1];
  const isUp = last > first;
  const isDown = last < first;

  return (
    <div className="flex items-center gap-1">
      <div className="w-[60px] h-6 opacity-80">
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
      {isUp && <TrendingUp className="h-3.5 w-3.5 text-success" />}
      {isDown && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
    </div>
  );
}

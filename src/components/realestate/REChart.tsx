'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from 'recharts';

interface BaseChartProps {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  baseline?: { value: number; label: string };
  height?: number;
}

interface LineChartProps extends BaseChartProps {
  type: 'line';
  yKeys: { key: string; color: string; name: string }[];
  dualAxis?: boolean;
}

interface AreaChartProps extends BaseChartProps {
  type: 'area';
  yKeys: { key: string; color: string; name: string }[];
}

interface BarChartProps extends BaseChartProps {
  type: 'bar';
  yKeys: { key: string; color: string; name: string }[];
}

type ChartProps = LineChartProps | AreaChartProps | BarChartProps;

const tooltipStyle = {
  contentStyle: {
    background: '#141820',
    border: '1px solid #1E2A3A',
    borderRadius: '2px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#E8EAED',
  },
  labelStyle: { color: '#5A6A7A', fontSize: '10px' },
};

export default function REChart(props: ChartProps) {
  const { title, data, xKey, baseline, height = 260 } = props;

  const baselineRef = baseline ? (
    <ReferenceLine
      y={baseline.value}
      stroke="#FFB020"
      strokeDasharray="6 4"
      strokeWidth={1.5}
      label={{
        value: baseline.label,
        position: 'right',
        fill: '#FFB020',
        fontSize: 10,
        fontFamily: 'monospace',
      }}
    />
  ) : null;

  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3A" />;
  const xaxis = (
    <XAxis
      dataKey={xKey}
      tick={{ fill: '#5A6A7A', fontSize: 10, fontFamily: 'monospace' }}
      axisLine={{ stroke: '#1E2A3A' }}
      tickLine={false}
    />
  );

  return (
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
      <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-3">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {props.type === 'line' ? (
          <LineChart data={data}>
            {grid}
            {xaxis}
            <YAxis
              yAxisId="left"
              tick={{ fill: '#5A6A7A', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#1E2A3A' }}
              tickLine={false}
            />
            {props.dualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#5A6A7A', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#1E2A3A' }}
                tickLine={false}
              />
            )}
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
            />
            {baselineRef}
            {props.yKeys.map((yk, i) => (
              <Line
                key={yk.key}
                yAxisId={props.dualAxis && i > 0 ? 'right' : 'left'}
                type="monotone"
                dataKey={yk.key}
                stroke={yk.color}
                name={yk.name}
                strokeWidth={2}
                dot={{ r: 2, fill: yk.color }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        ) : props.type === 'area' ? (
          <AreaChart data={data}>
            {grid}
            {xaxis}
            <YAxis
              tick={{ fill: '#5A6A7A', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#1E2A3A' }}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
            />
            {baselineRef}
            {props.yKeys.map((yk) => (
              <Area
                key={yk.key}
                type="monotone"
                dataKey={yk.key}
                stroke={yk.color}
                fill={yk.color}
                fillOpacity={0.15}
                name={yk.name}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            {grid}
            {xaxis}
            <YAxis
              tick={{ fill: '#5A6A7A', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#1E2A3A' }}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
            />
            {baselineRef}
            {props.yKeys.map((yk) => (
              <Bar
                key={yk.key}
                dataKey={yk.key}
                fill={yk.color}
                name={yk.name}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

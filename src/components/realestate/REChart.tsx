'use client';

import { useState } from 'react';
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

export interface EventAnnotation {
  xValue: string;
  label: string;
  color: string;
}

interface BaseChartProps {
  title: string;
  info?: string;
  data: Record<string, unknown>[];
  xKey: string;
  baseline?: { value: number; label: string };
  events?: EventAnnotation[];
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

function ChartInfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex ml-2 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-[#5A6A7A] hover:text-[#8899AA] transition-colors">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.75" fill="currentColor" />
      </svg>
      {show && (
        <div className="absolute z-50 top-full left-0 mt-2 w-64 p-2 bg-[#1A2332] border border-[#1E2A3A] rounded-sm shadow-lg">
          <p className="text-[10px] font-mono text-[#8899AA] leading-relaxed whitespace-normal">{text}</p>
        </div>
      )}
    </span>
  );
}

function renderEventAnnotations(events?: EventAnnotation[]) {
  if (!events) return null;
  return events.map((evt, i) => (
    <ReferenceLine
      key={`evt-${i}`}
      x={evt.xValue}
      stroke={evt.color}
      strokeDasharray="4 3"
      strokeWidth={1}
      label={undefined}
    />
  ));
}

// Small event legend rendered below chart title
function EventLegend({ events }: { events?: EventAnnotation[] }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="flex gap-3 mb-2">
      {events.map((evt, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="w-3 border-t border-dashed" style={{ borderColor: evt.color }} />
          <span className="text-[9px] font-mono" style={{ color: evt.color }}>{evt.label}</span>
        </span>
      ))}
    </div>
  );
}

export default function REChart(props: ChartProps) {
  const { title, info, data, xKey, baseline, events, height = 240 } = props;

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
    <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[11px] uppercase tracking-wider text-[#5A6A7A] font-mono flex items-center">
          {title}
          {info && <ChartInfoTooltip text={info} />}
        </h3>
      </div>
      <EventLegend events={events} />
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
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
            {baselineRef}
            {renderEventAnnotations(events)}
            {props.yKeys.map((yk, i) => (
              <Line
                key={yk.key}
                yAxisId={props.dualAxis && i > 0 ? 'right' : 'left'}
                type="monotone"
                dataKey={yk.key}
                stroke={yk.color}
                name={yk.name}
                strokeWidth={2}
                dot={{ r: 3, fill: yk.color }}
                activeDot={{ r: 5 }}
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
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
            {baselineRef}
            {renderEventAnnotations(events)}
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
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
            {baselineRef}
            {renderEventAnnotations(events)}
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

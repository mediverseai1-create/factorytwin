"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#486779", "#E5A13A", "#3D765C", "#8997A0", "#B5483A"];

export function TrendChart({ data, label }: { data: { date: string; value: number }[]; label: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-slate">No records in this range.</p>;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#14283B14" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Line type="monotone" dataKey="value" name={label} stroke="#486779" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, keys, x = "name" }: { data: Record<string, string | number | null>[]; keys: string[]; x?: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-slate">No data to compare yet.</p>;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="#14283B14" vertical={false} />
          <XAxis dataKey={x} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          {keys.length > 1 && <Legend />}
          {keys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Single-series weekly applications bar chart (one hue; recessive grid; hover tooltip). */
export function PipelineChart({ data }: { data: { week: string; n: number }[] }) {
  return (
    <div className="h-48" role="img" aria-label={`Applications per week: ${data.map((d) => `${d.week} ${d.n}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)" }} formatter={(v) => [v, "Applications"]} />
          <Bar dataKey="n" fill="var(--gold)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

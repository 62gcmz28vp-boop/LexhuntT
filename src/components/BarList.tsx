/** Accessible single-hue horizontal bar list with direct value labels (no colour-only encoding). */
export function BarList({ data, unit = "", empty = "No data yet." }: { data: { label: string; value: number; hint?: string }[]; unit?: string; empty?: string }) {
  if (!data.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <table className="w-full text-sm">
      <tbody>
        {data.map((d) => (
          <tr key={d.label} title={d.hint ?? `${d.label}: ${d.value}${unit}`}>
            <td className="w-[42%] py-1.5 pe-3 align-middle text-xs text-ink-2">{d.label}</td>
            <td className="py-1.5 align-middle">
              <div className="flex items-center gap-2">
                <div className="h-2.5 rounded-e bg-gold" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
                <span className="text-xs tabular-nums text-ink">
                  {d.value}
                  {unit}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

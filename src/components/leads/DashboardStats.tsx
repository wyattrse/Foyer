import { COLORS } from "@/lib/theme";
import { StatCard } from "@/components/ui/StatCard";
import { dueStatus } from "@/lib/scoring";
import type { LeadWithStatus, Listing, Task } from "@/lib/types";

// Condensed always-visible snapshot on the main pipeline view -- the fuller
// breakdown (by lead type, CSV export) stays in the separate Overview subtab
// so this stays glanceable rather than duplicating that page.
export function DashboardStats({ leads, listings, tasks }: { leads: LeadWithStatus[]; listings: Listing[]; tasks: Task[] }) {
  const active = leads.filter((l) => l.is_active);
  const hot = active.filter((l) => l.bucket === "hot").length;
  const overdue = active.filter((l) => dueStatus(l.next_touch_due) === "overdue").length;
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      <StatCard label="Active leads" value={active.length} delay={0} />
      <StatCard label="Hot" value={hot} color={COLORS.accentBright} delay={40} />
      <StatCard label="Overdue follow-ups" value={overdue} color={overdue > 0 ? COLORS.accentBright : COLORS.ink} delay={80} />
      <StatCard label="Open tasks" value={openTasks} delay={120} />
      <StatCard label="Listings" value={listings.length} delay={160} />
    </div>
  );
}

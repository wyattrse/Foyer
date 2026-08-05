import { COLORS } from "@/lib/theme";

function SkeletonBlock({ w, h = 10 }: { w: string; h?: number }) {
  return <div className="skeleton-pulse" style={{ width: w, height: h, background: COLORS.surface2, borderRadius: 3 }} />;
}

function SkeletonCard() {
  return (
    <div className="p-3.5 mb-2.5" style={{ background: COLORS.surface, borderRadius: 6, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 18px rgba(0,0,0,0.3)" }}>
      <div className="flex items-center gap-3">
        <div className="skeleton-pulse" style={{ width: 38, height: 38, borderRadius: "50%", background: COLORS.surface2, flexShrink: 0 }} />
        <div className="flex-1 space-y-2">
          <SkeletonBlock w="55%" />
          <SkeletonBlock w="30%" h={8} />
        </div>
      </div>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="max-w-md">
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

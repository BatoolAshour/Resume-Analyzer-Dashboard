import { Badge } from "@/components/ui/Badge";
import { priorityStyles } from "@/lib/tones";
import type { Priority } from "@/types/analysis";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { tone, icon, label, hint } = priorityStyles[priority];
  return (
    <span title={hint}>
      <Badge tone={tone} icon={icon}>
        {label}
      </Badge>
    </span>
  );
}

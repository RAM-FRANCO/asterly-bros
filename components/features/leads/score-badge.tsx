import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

function getScoreVariant(score: number): string {
  if (score >= 85) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(getScoreVariant(score), "border-transparent", className)}
      aria-label={`Lead score: ${score}`}
    >
      {score}
    </Badge>
  );
}


import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "primary" | "yellow" | "green" | "red";
  onClick: () => void;
}

export const StatCard = ({ title, value, icon: Icon, color, onClick }: StatCardProps) => {
  const colorClasses = {
    primary: "text-primary border-primary/30 bg-primary/10",
    yellow: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
    green: "text-green-500 border-green-500/30 bg-green-500/10",
    red: "text-red-500 border-red-500/30 bg-red-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-xl border ${colorClasses[color]} hover:scale-105 transition-transform text-left`}
    >
      <Icon className="w-8 h-8 mb-3" />
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{title}</p>
    </button>
  );
};
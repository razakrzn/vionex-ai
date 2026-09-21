import {
  Dumbbell,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/pages/admin/components/StatCard";
import { Button } from "@/components/ui/button";

interface FitnessOverviewTabProps {
  stats: {
    totalGyms: number;
    approvedGyms: number;
    pendingGyms: number;
    rejectedGyms: number;
  };
  isApproved?: boolean;
  onAddGym?: () => void;
}

export const FitnessOverviewTab = ({ stats, isApproved = false, onAddGym }: FitnessOverviewTabProps) => {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Welcome to Your Fitness Dashboard! 💪
            </h2>
            <p className="text-muted-foreground">
              Manage your gyms, track members, and grow your fitness business.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-sm font-semibold text-primary">Fitness Portal</span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gyms"
          value={stats.totalGyms}
          icon={Dumbbell}
          color="primary"
          onClick={() => {}}
        />
        <StatCard
          title="Approved"
          value={stats.approvedGyms}
          icon={CheckCircle2}
          color="green"
          onClick={() => {}}
        />
        <StatCard
          title="Pending"
          value={stats.pendingGyms}
          icon={Clock}
          color="yellow"
          onClick={() => {}}
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedGyms}
          icon={XCircle}
          color="red"
          onClick={() => {}}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-glass-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">Manage your fitness business</p>
          </div>
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-2">
          {isApproved && (
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              size="sm"
              onClick={onAddGym}
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Add New Gym
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};


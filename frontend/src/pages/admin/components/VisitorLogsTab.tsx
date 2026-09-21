import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getVisitorLogsApi, type VisitorLog } from "@/services/admin/dashboard";
import { useToast } from "@/hooks/use-toast";

export const VisitorLogsTab = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getVisitorLogsApi();
        if ("data" in response && response.data?.data) {
          setLogs(response.data.data);
        } else {
          setLogs([]);
          setError("No visitor data available.");
        }
      } catch (err: any) {
        setLogs([]);
        setError("Failed to load visitor logs.");
        toast({
          title: "Error",
          description: err?.response?.data?.message || "Failed to load visitor logs.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading visitor logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-glass-border bg-card p-6 text-center text-muted-foreground">
        {error}
      </div>
    );
  }

  const formatTimestamp = (value?: string) => {
    if (!value) return { date: "-", time: "-" };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: value, time: "-" };
    const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return { date: datePart, time: timePart };
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-glass-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-glass-border">
          <h3 className="font-semibold text-foreground">Visitor Logs</h3>
          <p className="text-xs text-muted-foreground">Recent activity across the platform.</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">User Agent</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const { date, time } = formatTimestamp(log.timestamp);
                return (
                  <tr key={log.id ?? index} className="border-t border-glass-border">
                    <td className="px-4 py-3">{log.ip_address || "-"}</td>
                    <td className="px-4 py-3">{log.device || "-"}</td>
                    <td className="px-4 py-3">{log.city || "-"}</td>
                    <td className="px-4 py-3">{log.country || "-"}</td>
                    <td className="px-4 py-3 max-w-[320px] truncate" title={log.user_agent || ""}>
                      {log.user_agent || "-"}
                    </td>
                    <td className="px-4 py-3">{date}</td>
                    <td className="px-4 py-3">{time}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No visitor logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


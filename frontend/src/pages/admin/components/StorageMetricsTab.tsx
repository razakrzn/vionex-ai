import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getStorageMetricsApi, type StorageMetricsResponse } from "@/services/admin/dashboard";
import { Loader2, Database, HardDrive, FileText, Calendar, MapPin, DollarSign } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const StorageMetricsTab = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<number>(1); // Default to 24 hours (1 day)
  const [storageData, setStorageData] = useState<StorageMetricsResponse["data"] | null>(null);

  useEffect(() => {
    loadStorageMetrics();
  }, [days]);

  const loadStorageMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await getStorageMetricsApi(days);
      
      if (response && "data" in response) {
        const responseData = response.data as StorageMetricsResponse;
        if (responseData.data) {
          setStorageData(responseData.data);
        } else {
          setStorageData(null);
          toast({
            title: "No Data",
            description: "Storage metrics data is not available.",
            variant: "default",
          });
        }
      } else {
        setStorageData(null);
        toast({
          title: "Error",
          description: "Failed to load storage metrics.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error loading storage metrics:", error);
      setStorageData(null);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load storage metrics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading storage metrics...</p>
        </div>
      </div>
    );
  }

  if (!storageData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No storage metrics data available.</p>
        <Button onClick={loadStorageMetrics} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const { storage, enabled } = storageData;

  if (!enabled) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Storage metrics are not enabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Storage Metrics</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monitor your storage usage and history
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="days-select" className="text-sm whitespace-nowrap">Days:</Label>
            <Select
              value={days.toString()}
              onValueChange={(value) => setDays(parseInt(value))}
            >
              <SelectTrigger id="days-select" className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">24 hours</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={loadStorageMetrics} variant="outline" size="sm" className="w-full sm:w-auto">
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold break-words">{formatBytes(storage.size_bytes)}</div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {storage.size_mb.toFixed(2)} MB / {storage.size_gb.toFixed(2)} GB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Object Count</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold break-words">{storage.object_count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total objects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold break-words">${storage.estimated_cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">USD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bucket Name</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-lg font-semibold break-words">{storage.bucket_name}</div>
            <p className="text-xs text-muted-foreground mt-1">Storage bucket</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Region</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-base sm:text-lg font-semibold break-words">{storage.region}</div>
            <p className="text-xs text-muted-foreground mt-1">AWS region</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage by Type */}
      {storage.by_storage_type && storage.by_storage_type.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage by Type</CardTitle>
            <CardDescription>Breakdown of storage by storage type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Storage Type</TableHead>
                      <TableHead className="min-w-[100px]">Size</TableHead>
                      <TableHead className="min-w-[80px]">Size (MB)</TableHead>
                      <TableHead className="min-w-[100px]">Object Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storage.by_storage_type.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.storage_type}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatBytes(item.size_bytes)}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.size_mb?.toFixed(2) || "N/A"} MB</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.object_count !== null && item.object_count !== undefined
                            ? item.object_count.toLocaleString()
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      {storage.history && storage.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage History</CardTitle>
            <CardDescription>
              Historical data for the last {days} {days === 1 ? 'day' : 'days'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Date</TableHead>
                      <TableHead className="min-w-[100px]">Size</TableHead>
                      <TableHead className="min-w-[80px]">Size (MB)</TableHead>
                      <TableHead className="min-w-[100px]">Object Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storage.history.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="whitespace-nowrap">{format(new Date(item.date), "MMM dd, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatBytes(item.size_bytes)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {(item.size_bytes / (1024 * 1024)).toFixed(2)} MB
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{item.object_count.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <Card>
        <CardHeader>
          <CardTitle>Last Updated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(storage.last_updated), "PPpp")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


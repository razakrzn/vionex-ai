import { useState, useEffect } from "react";
import { Wallet, CreditCard, TrendingUp, ArrowDown, ArrowUp, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWalletApi, WalletResponse } from "@/services/partner/payments";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PartnerWalletTabProps {}

export const PartnerWalletTab = ({}: PartnerWalletTabProps) => {
  const { toast } = useToast();
  const [walletData, setWalletData] = useState<WalletResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getWalletApi();
      
      if ('data' in response && 'status' in response) {
        const responseData = response.data as WalletResponse;
        
        if (responseData?.success && responseData?.data) {
          setWalletData(responseData.data);
        } else if (responseData?.data) {
          setWalletData(responseData.data);
        } else {
          setError("No wallet data available");
        }
      } else {
        setError("Failed to fetch wallet information");
      }
    } catch (err: any) {
      console.error("Error fetching wallet:", err);
      const errorMessage = err?.response?.data?.message || "Failed to load wallet information. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();

    // Listen for wallet refresh events (e.g., after property sale)
    const handleWalletRefresh = () => {
      fetchWallet();
    };
    window.addEventListener("wallet-refresh", handleWalletRefresh);

    return () => {
      window.removeEventListener("wallet-refresh", handleWalletRefresh);
    };
  }, []);

  const formatCurrency = (amount: number | string, currency: string = "AED") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Calculate points from balance (1 point = 1 AED)
  const getPoints = () => {
    if (!walletData?.balance) return 0;
    const balance = typeof walletData.balance === "string" 
      ? parseFloat(walletData.balance) 
      : walletData.balance;
    return Math.floor(balance); // 1 point = 1 AED
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !walletData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchWallet} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Points Card */}
      <Card className="glass neon-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Wallet Points
              </CardTitle>
              <CardDescription>Your redeemable points (1 point = 1 AED)</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchWallet}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            {/* Points */}
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Available Points</p>
              <div className="flex items-baseline gap-2 justify-center">
                <span className="text-5xl font-bold text-primary">
                  {getPoints().toLocaleString()}
                </span>
                <span className="text-muted-foreground text-lg">points</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                1 point = 1 {walletData?.currency || "AED"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      {walletData?.transactions && walletData.transactions.length > 0 ? (
        <Card className="glass neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Transaction History
            </CardTitle>
            <CardDescription>Recent wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {walletData.transactions.map((transaction) => {
                const rawType =
                  (transaction as any).transaction_type ||
                  (transaction as any).type ||
                  "";
                const type = typeof rawType === "string" ? rawType.toLowerCase() : "";
                const isCredit = type.includes("credit");
                return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-glass-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`p-3 rounded-lg ${
                        isCredit
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDown className="h-5 w-5" />
                      ) : (
                        <ArrowUp className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {transaction.description ||
                          (isCredit ? "Credit" : "Debit")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                      {(transaction as any).balance_before !== undefined &&
                        (transaction as any).balance_after !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Balance:{" "}
                            {formatCurrency((transaction as any).balance_before, walletData?.currency || "AED")} →{" "}
                            {formatCurrency((transaction as any).balance_after, walletData?.currency || "AED")}
                          </p>
                        )}
                      {transaction.status && (
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                            transaction.status === "completed"
                              ? "bg-green-500/10 text-green-500"
                              : transaction.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        isCredit
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {typeof transaction.amount === "string" 
                        ? parseFloat(transaction.amount).toLocaleString()
                        : transaction.amount.toLocaleString()}{" "}
                      points
                    </p>
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass neon-border">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your transaction history will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="glass neon-border bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">About Your Wallet</p>
              <p className="text-sm text-muted-foreground">
                Your wallet balance can be used for future purchases on the platform. 
                Points are redeemable credits that can be used for premium listings and services. 
                <span className="font-semibold text-primary"> Earn 10 points for every property sold through Vionex AI!</span> 
                In case of transaction errors or duplicate payments, amounts are automatically 
                credited to your wallet as points.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


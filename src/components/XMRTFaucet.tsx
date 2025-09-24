// Disabled component - Web3 dependencies not available
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import React from "react";

// Mock interfaces for compatibility
interface WalletState {
  address: string | null;
  isConnected: boolean;
}

interface XMRTFaucetProps {
  wallet?: WalletState;
  onClaimed?: () => void;
}

const XMRTFaucet = ({ wallet, onClaimed }: XMRTFaucetProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          XMRT Faucet
        </CardTitle>
        <CardDescription>
          Web3 functionality currently unavailable
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            This feature requires Web3 dependencies that are not currently installed.
          </p>
          <Button variant="outline" disabled>
            Faucet Disabled
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default XMRTFaucet;
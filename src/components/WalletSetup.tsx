import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WalletSetupProps {
  accounts: string[];
  onComplete: (selectedAccount: string) => void;
}

const WalletSetup = ({ accounts, onComplete }: WalletSetupProps) => {
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const handleNext = () => {
    if (!selectedAccount) {
      toast.error("Please select an account to continue");
      return;
    }
    if (step === 1) {
      setStep(2);
    } else {
      onComplete(selectedAccount);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {step === 1 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Select Your Account</CardTitle>
            <CardDescription className="text-gray-400">
              Choose which MetaMask account you'd like to use for collectables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              className="space-y-4"
              value={selectedAccount}
              onValueChange={setSelectedAccount}
            >
              {accounts.map((account) => (
                <div key={account} className="flex items-center space-x-2">
                  <RadioGroupItem value={account} id={account} />
                  <Label htmlFor={account} className="text-white">
                    {account}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              className="mt-6 w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              onClick={handleNext}
            >
              Next
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create Collectables Wallet</CardTitle>
            <CardDescription className="text-gray-400">
              We'll set up a dedicated space for your digital collectables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300">
              <h3 className="font-semibold mb-2">What you'll get:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Dedicated NFT storage</li>
                <li>Easy collectables management</li>
                <li>Secure asset tracking</li>
              </ul>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              onClick={handleNext}
            >
              Create Wallet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WalletSetup;
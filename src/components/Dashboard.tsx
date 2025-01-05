import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletState } from "@/hooks/useWallet";
import WalletSetup from "./WalletSetup";
import { CheckCircle, Wallet2, ImageIcon, CodeIcon, FileTextIcon, MusicIcon, ArrowRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface DashboardProps {
  wallet: WalletState;
  onSetupComplete: (selectedAccount: string) => void;
}

const Dashboard = ({ wallet, onSetupComplete }: DashboardProps) => {
  const [assetType, setAssetType] = useState<string>("");

  if (!wallet.isSetupComplete) {
    return <WalletSetup accounts={wallet.availableAccounts} onComplete={onSetupComplete} />;
  }

  const getWalletBrand = () => {
    if (typeof window.ethereum !== 'undefined') {
      if (window.ethereum.isMetaMask) return 'MetaMask';
      if (window.ethereum.isWalletConnect) return 'WalletConnect';
      return 'Unknown Wallet';
    }
    return 'No Wallet Detected';
  };

  const renderWorkflowSteps = () => {
    const workflows = {
      image: [
        "Upload your image file (PNG, JPG, GIF)",
        "Set image properties (dimensions, resolution)",
        "Add metadata (title, description, attributes)",
        "Preview your NFT",
      ],
      code: [
        "Upload or paste your smart contract code",
        "Configure contract parameters",
        "Test contract functionality",
        "Deploy and verify contract",
      ],
      document: [
        "Upload your document (PDF, DOC)",
        "Set access permissions",
        "Add version control settings",
        "Configure sharing options",
      ],
      audio: [
        "Upload your audio file (MP3, WAV)",
        "Set audio properties (bitrate, duration)",
        "Add track information",
        "Configure playback settings",
      ],
    };

    const steps = assetType ? workflows[assetType as keyof typeof workflows] : null;

    if (!steps) return null;

    return (
      <Card className="mt-6 bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Asset Creation Steps</CardTitle>
          <CardDescription className="text-gray-400">
            Follow these steps to create your {assetType} asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="bg-purple-400/10 rounded-full p-2">
                  <span className="text-purple-400 font-bold">{index + 1}</span>
                </div>
                <div>
                  <p className="text-white">{step}</p>
                </div>
              </div>
            ))}
            <div className="mt-6 flex justify-center">
              <button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all">
                Start Creating
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet2 className="h-5 w-5 text-purple-400" />
                {getWalletBrand()}
                <CheckCircle className="h-5 w-5 text-green-400 animate-pulse" />
              </CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Connected wallet details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Address</span>
                <span className="text-purple-400 text-sm truncate max-w-[200px]">
                  {wallet.address}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Balance</span>
                <span className="text-blue-400">{wallet.balance} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Network</span>
                <span className="text-green-400">Chain ID: {wallet.chainId}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Select Asset Type</CardTitle>
            <CardDescription className="text-gray-400">
              Choose the type of asset you want to create
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={assetType}
              onValueChange={setAssetType}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="image"
                  id="image"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="image"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
                >
                  <ImageIcon className="mb-3 h-6 w-6 text-purple-400" />
                  <span className="text-sm font-medium">Image NFT</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="code"
                  id="code"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="code"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
                >
                  <CodeIcon className="mb-3 h-6 w-6 text-blue-400" />
                  <span className="text-sm font-medium">Smart Contract</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="document"
                  id="document"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="document"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
                >
                  <FileTextIcon className="mb-3 h-6 w-6 text-green-400" />
                  <span className="text-sm font-medium">Document</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="audio"
                  id="audio"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="audio"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-4 hover:bg-gray-700/30 peer-data-[state=checked]:border-purple-500 [&:has([data-state=checked])]:border-purple-500 cursor-pointer"
                >
                  <MusicIcon className="mb-3 h-6 w-6 text-yellow-400" />
                  <span className="text-sm font-medium">Audio NFT</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {renderWorkflowSteps()}
    </div>
  );
};

export default Dashboard;
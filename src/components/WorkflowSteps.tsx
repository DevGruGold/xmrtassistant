import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface WorkflowStepsProps {
  assetType: string;
}

const WorkflowSteps = ({ assetType }: WorkflowStepsProps) => {
  const workflows = {
    image: [
      "Create a base ERC-721 or ERC-1155 contract for optimal gas efficiency",
      "Upload your image file (PNG, JPG, GIF)",
      "Set image properties (dimensions, resolution)",
      "Add metadata (title, description, attributes)",
      "Preview your NFT",
    ],
    code: [
      "Deploy a factory contract for efficient contract deployment",
      "Upload or paste your smart contract code",
      "Configure contract parameters",
      "Test contract functionality",
      "Deploy and verify contract",
    ],
    document: [
      "Initialize an ERC-721 contract with document management features",
      "Upload your document (PDF, DOC)",
      "Set access permissions",
      "Add version control settings",
      "Configure sharing options",
    ],
    audio: [
      "Set up an ERC-721 contract optimized for audio NFTs",
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

export default WorkflowSteps;
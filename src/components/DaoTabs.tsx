import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Gavel, PiggyBank, FileText, MessageSquare, Coins } from "lucide-react";

interface DaoTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const DaoTabs = ({ activeTab, onTabChange }: DaoTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid grid-cols-6 w-full bg-gray-800">
        <TabsTrigger value="members" className="data-[state=active]:bg-gray-700">
          <Users className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Members</span>
        </TabsTrigger>
        <TabsTrigger value="xmrt" className="data-[state=active]:bg-gray-700">
          <Coins className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">XMRT</span>
        </TabsTrigger>
        <TabsTrigger value="governance" className="data-[state=active]:bg-gray-700">
          <Gavel className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Governance</span>
        </TabsTrigger>
        <TabsTrigger value="treasury" className="data-[state=active]:bg-gray-700">
          <PiggyBank className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Treasury</span>
        </TabsTrigger>
        <TabsTrigger value="proposals" className="data-[state=active]:bg-gray-700">
          <FileText className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Proposals</span>
        </TabsTrigger>
        <TabsTrigger value="discussions" className="data-[state=active]:bg-gray-700">
          <MessageSquare className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">Discussions</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DaoTabs;
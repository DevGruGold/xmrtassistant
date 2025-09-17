import { Languages } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 py-2 shadow-lg">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">EN</span>
      <Switch
        checked={language === 'es'}
        onCheckedChange={(checked) => setLanguage(checked ? 'es' : 'en')}
        className="data-[state=checked]:bg-primary"
      />
      <span className="text-sm font-medium text-foreground">ES</span>
    </div>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { IdeaSubmissionForm } from "@/components/IdeaSubmissionForm";
import { IdeaDashboard } from "@/components/IdeaDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Treasury = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <LanguageToggle />
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            {t('treasury.title')}
          </h1>
          <p className="text-gray-400">{t('treasury.description')}</p>
        </header>

        <Tabs defaultValue="treasury" className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="treasury">Treasury</TabsTrigger>
            <TabsTrigger value="submit">Submit Idea</TabsTrigger>
            <TabsTrigger value="ideas">Community Ideas</TabsTrigger>
          </TabsList>

          <TabsContent value="treasury">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">{t('treasury.purchase.title')}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {t('treasury.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ width: "100%", height: "600px" }}>
                    <iframe
                      src="https://buy.onramper.com?color=266677&apiKey=pk_prod_01HMVZ8HJ2E7XQFVT2VVJMVZ0Q"
                      title="Onramper widget"
                      height="600px"
                      width="100%"
                      allow="accelerometer; autoplay; camera; gyroscope; payment"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">{t('treasury.stats.title')}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {t('treasury.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>{t('treasury.stats.tvl')}</span>
                      <span className="text-purple-400">$0.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{t('treasury.stats.contributors')}</span>
                      <span className="text-blue-400">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="submit">
            <IdeaSubmissionForm />
          </TabsContent>

          <TabsContent value="ideas">
            <IdeaDashboard />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Treasury;
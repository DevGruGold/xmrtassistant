import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";

const Treasury = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            XMRT Treasury
          </h1>
          <p className="text-gray-400">Contribute to the XMRT Master DAO</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">OnRamper Integration</CardTitle>
              <CardDescription className="text-gray-400">
                Purchase crypto to contribute to the treasury
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
              <CardTitle className="text-white">Treasury Stats</CardTitle>
              <CardDescription className="text-gray-400">
                Current treasury holdings and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Value Locked</span>
                  <span className="text-purple-400">$0.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Contributors</span>
                  <span className="text-blue-400">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Treasury;
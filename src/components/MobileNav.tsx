import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMenu}
          className="md:hidden text-white hover:bg-gray-700"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/95 backdrop-blur-sm md:hidden">
          <nav className="flex flex-col items-center justify-center h-full space-y-8">
            <Link
              to="/"
              className="text-2xl font-bold text-white hover:text-purple-400 transition-colors"
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link
              to="/treasury"
              className="text-2xl font-bold text-white hover:text-purple-400 transition-colors"
              onClick={toggleMenu}
            >
              Treasury
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
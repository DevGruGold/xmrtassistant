import { Github, Twitter, Mail, Phone } from "lucide-react";
import { Button } from "./ui/button";

export function Footer() {
  const openWhatsApp = () => {
    const message = "Hello XMRT Solutions, I'm interested in learning more about the DAO.";
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/50661500559?text=${encodedMessage}`, '_blank');
  };

  const openEmail = () => {
    const subject = "XMRT Master DAO Inquiry";
    const body = "Hello XMRT Solutions,\n\nI'm interested in learning more about the DAO.\n\nBest regards,";
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:xmrtsolutions@gmail.com?subject=${encodedSubject}&body=${encodedBody}`;
  };

  return (
    <footer className="w-full bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 py-4 sm:py-6 mt-8 sm:mt-12">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="text-gray-400 text-xs sm:text-sm text-center sm:text-left">
            © 2024 XMRT Master DAO. All rights reserved.
          </div>
          <div className="flex gap-3 sm:gap-4 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={openEmail}
              className="text-gray-400 hover:text-purple-500 transition-colors h-8 w-8 sm:h-10 sm:w-10"
            >
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openWhatsApp}
              className="text-gray-400 hover:text-purple-500 transition-colors h-8 w-8 sm:h-10 sm:w-10"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <a
              href="https://twitter.com/XMRTMasterDAO"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-500 transition-colors p-2"
            >
              <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <a
              href="https://github.com/XMRTMasterDAO"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-500 transition-colors p-2"
            >
              <Github className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
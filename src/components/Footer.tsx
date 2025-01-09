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
    <footer className="w-full bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            © 2024 XMRT Master DAO. All rights reserved.
          </div>
          <div className="flex gap-4 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={openEmail}
              className="text-gray-400 hover:text-purple-500 transition-colors"
            >
              <Mail className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openWhatsApp}
              className="text-gray-400 hover:text-purple-500 transition-colors"
            >
              <Phone className="w-5 h-5" />
            </Button>
            <a
              href="https://twitter.com/XMRTMasterDAO"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-500 transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/XMRTMasterDAO"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-500 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
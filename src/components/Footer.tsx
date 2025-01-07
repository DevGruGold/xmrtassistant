import { Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            © 2024 XMRT Master DAO. All rights reserved.
          </div>
          <div className="flex gap-4">
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
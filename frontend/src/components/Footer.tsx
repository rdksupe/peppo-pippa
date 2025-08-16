import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Video Generator</h3>
            <p className="text-gray-600 text-sm">
              Transform your creative ideas into stunning videos using advanced AI technology.
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Features</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Text-to-video generation</li>
              <li>Real-time processing status</li>
              <li>High-quality output</li>
              <li>Fast generation times</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a 
                  href="https://github.com/rdksupe/peppo-pippa" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a 
                  href="/docs" 
                  className="hover:text-blue-600 transition-colors"
                >
                  API Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Built with ❤️ for the Peppo AI Engineering Internship Challenge
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

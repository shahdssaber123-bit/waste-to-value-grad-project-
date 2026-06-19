import React from 'react';
import { Link } from 'react-router-dom';
import { Recycle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-hero text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold text-lg text-white">Waste-to-Value</span>
            </div>
            <p className="text-sm leading-relaxed text-white/80">Transforming waste logistics through technology, transparency, and trust.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link to="/register" className="hover:text-white transition-colors">For Suppliers</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">For Industry</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">For Drivers</Link></li>
              <li><Link to="/operations" className="hover:text-white transition-colors">HUB Operations</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><a href="#process" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#esg" className="hover:text-white transition-colors">ESG Reports</a></li>
              <li><Link to="/operations" className="hover:text-white transition-colors">API Access</Link></li>
              <li><a href="#materials" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><a href="#platform" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#materials" className="hover:text-white transition-colors">Careers</a></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Contact</Link></li>
              <li><a href="#esg" className="hover:text-white transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/15 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/75">© 2026 Waste-to-Value. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-white/75">
            <a href="#platform" className="hover:text-white">Terms</a>
            <a href="#esg" className="hover:text-white">Privacy</a>
            <a href="#materials" className="hover:text-white">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
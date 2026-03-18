import { Link } from 'react-router-dom';
import { CalendarIcon } from '@heroicons/react/24/outline';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center text-white mb-3">
              <CalendarIcon className="h-7 w-7 text-indigo-400" />
              <span className="ml-2 text-xl font-bold">RemiDesk</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              B2B appointment reminder SaaS for micro businesses.
              Serving Canada, Australia, and the UK.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Free Trial
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Legal &amp; Support
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:privacy@remidesk.com"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Contact / Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {currentYear} RemiDesk. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs">
            Compliant with GDPR · PIPEDA · Privacy Act 1988
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

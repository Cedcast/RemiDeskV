import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
    <div className="text-gray-700 space-y-3">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">
            <strong>RemiDesk</strong> &nbsp;|&nbsp; Last updated: March 2026 &nbsp;|&nbsp; Version 1.0
          </p>
        </div>

        <Section title="1. Introduction">
          <p>
            RemiDesk ("<strong>we</strong>", "<strong>our</strong>", or "<strong>us</strong>") is a B2B appointment
            reminder SaaS platform serving businesses in Canada, Australia, and the United Kingdom. This Privacy Policy
            explains how we collect, use, store, and protect your information when you use our service.
          </p>
          <p>
            By using RemiDesk you agree to the practices described in this policy. If you do not agree, please
            discontinue use of the service and contact us to delete your account.
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>Business information:</strong> business name, owner name, phone number, email address, and
              business address provided during registration.
            </li>
            <li>
              <strong>Appointment details:</strong> dates, times, client names, service types, and appointment notes
              entered by you in the dashboard.
            </li>
            <li>
              <strong>Payment information:</strong> billing plan and subscription status. Card and payment details are
              processed directly by Stripe or PayPal and are never stored on our servers.
            </li>
            <li>
              <strong>Usage analytics:</strong> feature interactions, API call counts, session duration, and error
              events to help us improve the service.
            </li>
            <li>
              <strong>Device and technical data:</strong> IP address, browser type, operating system, and access
              timestamps collected automatically by our servers and optional analytics tools.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Sending appointment reminder notifications to your clients via SMS and email.</li>
            <li>Processing subscription payments and issuing invoices.</li>
            <li>Providing and maintaining the RemiDesk service.</li>
            <li>Improving features based on aggregated usage analytics.</li>
            <li>Responding to support requests and account enquiries.</li>
            <li>Meeting legal obligations (e.g. tax records, fraud prevention).</li>
          </ul>
          <p className="mt-3 font-medium text-gray-900">
            We do not sell, rent, or share your personal data with third parties for marketing purposes.
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We use the following trusted third-party processors to deliver our service:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">Service</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">Provider</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Payment processing', 'Stripe / PayPal', 'Subscription billing'],
                  ['SMS reminders', 'Twilio', 'Appointment SMS notifications'],
                  ['Email reminders', 'SendGrid / Mailgun', 'Appointment email notifications'],
                  ['Background jobs', 'APScheduler', 'Scheduling reminder tasks'],
                  ['Analytics (optional)', 'Google Analytics', 'Aggregated usage insights'],
                ].map(([purpose, provider, detail]) => (
                  <tr key={provider}>
                    <td className="px-4 py-2 text-gray-800">{purpose}</td>
                    <td className="px-4 py-2 text-gray-600">{provider}</td>
                    <td className="px-4 py-2 text-gray-600">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">Each provider has its own privacy policy and data processing agreement with us.</p>
        </Section>

        <Section title="5. Data Security">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>All data is transmitted over HTTPS/TLS encryption.</li>
            <li>Databases are encrypted at rest using industry-standard AES-256 encryption.</li>
            <li>Access to production systems is restricted to authorised personnel via multi-factor authentication.</li>
            <li>We conduct regular security reviews and apply timely security patches.</li>
            <li>API endpoints are protected by token-based authentication (JWT).</li>
          </ul>
        </Section>

        <Section title="6. Cookies and Tracking">
          <p>
            We use essential session cookies required for authentication and service functionality. We may also use
            optional analytics cookies (e.g. Google Analytics) to understand aggregate usage patterns. You may disable
            non-essential cookies in your browser settings without affecting core service functionality.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Active account data is retained for the duration of your subscription.</li>
            <li>After account deletion, business and appointment data is purged within 30 days.</li>
            <li>Billing records may be retained for up to 7 years to meet legal/tax obligations.</li>
            <li>Analytics data is stored in aggregate (non-identifiable) form indefinitely.</li>
          </ul>
        </Section>

        <Section title="8. Your Rights">
          <p>
            Depending on your jurisdiction, you may have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li>
              <strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements).
            </li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Restriction:</strong> Request that we limit processing of your data in certain circumstances.</li>
          </ul>
          <p className="mt-3">
            To exercise any right, email us at{' '}
            <a href="mailto:privacy@remidesk.com" className="text-indigo-600 hover:underline">
              privacy@remidesk.com
            </a>
            . We will respond within <strong>30 days</strong>.
          </p>
        </Section>

        <Section title="9. International Compliance">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <strong>GDPR (UK/EU):</strong> We process data under Article 6(1)(b) (contract performance) and
              Article 6(1)(f) (legitimate interests). UK users have rights under the UK GDPR and Data Protection
              Act 2018.
            </li>
            <li>
              <strong>PIPEDA (Canada):</strong> We comply with Canada's Personal Information Protection and
              Electronic Documents Act, collecting only the minimum data necessary and obtaining consent at
              registration.
            </li>
            <li>
              <strong>Privacy Act 1988 (Australia):</strong> We comply with the Australian Privacy Principles
              (APPs) and handle personal information in accordance with APP 1–13.
            </li>
            <li>
              <strong>CCPA (California):</strong> California residents may request disclosure of data collected
              and opt-out of any sale of personal information (we do not sell data).
            </li>
          </ul>
        </Section>

        <Section title="10. Contact for Privacy Inquiries">
          <p>For any privacy-related questions, data subject requests, or concerns:</p>
          <address className="not-italic bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3 text-sm space-y-1">
            <p><strong>RemiDesk Privacy Team</strong></p>
            <p>
              Email:{' '}
              <a href="mailto:privacy@remidesk.com" className="text-indigo-600 hover:underline">
                privacy@remidesk.com
              </a>
            </p>
            <p>Response time: within 30 days of receipt</p>
          </address>
        </Section>

        <Section title="11. Policy Updates">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email
            or by displaying a notice in the dashboard. The "Last updated" date at the top of this page reflects the
            most recent revision.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">Version</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">Date</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b">Changes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 text-gray-800">1.0</td>
                  <td className="px-4 py-2 text-gray-600">March 2026</td>
                  <td className="px-4 py-2 text-gray-600">Initial policy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;

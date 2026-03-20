import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
    <div className="text-gray-700 space-y-3">{children}</div>
  </section>
);

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm">
            <strong>RemiDesk</strong> &nbsp;|&nbsp; Last updated: March 2026 &nbsp;|&nbsp; Version 1.0
          </p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using RemiDesk ("<strong>the Service</strong>"), operated by RemiDesk
            ("<strong>we</strong>", "<strong>us</strong>"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, do not use the Service.
          </p>
        </Section>

        <Section title="2. Service Description">
          <p>
            RemiDesk is a B2B appointment reminder SaaS platform that enables businesses to schedule appointments,
            send automated SMS and email reminders to clients, manage client records, and process subscription
            payments. The Service is intended for business owners and their staff, not for end-consumers.
          </p>
        </Section>

        <Section title="3. Acceptable Use">
          <p>You agree to use the Service only for lawful purposes. You must not:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Send unsolicited spam or bulk messages through the platform.</li>
            <li>Use the Service to harass, abuse, or harm any individual.</li>
            <li>Attempt to gain unauthorised access to any system or data.</li>
            <li>Reverse-engineer, decompile, or copy the Service software.</li>
            <li>Resell or sublicense the Service without our written consent.</li>
            <li>Violate any applicable law or regulation in your jurisdiction.</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms without prior notice.
          </p>
        </Section>

        <Section title="4. Billing and Payment Terms">
          <p>
            RemiDesk offers subscription plans (Premium and Pro) billed monthly. All prices are displayed in your
            selected currency (USD, GBP, CAD, or AUD). A 7-day free trial is available with no credit card required.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Subscriptions automatically renew at the end of each billing period.</li>
            <li>You may cancel at any time; cancellation takes effect at the end of the current billing period.</li>
            <li>No refunds are provided for partial billing periods except where required by law.</li>
            <li>
              Payments are processed by Stripe or PayPal. You authorise us to charge your selected payment method
              on your renewal date.
            </li>
            <li>We reserve the right to change pricing with 30 days' notice to existing subscribers.</li>
          </ul>
        </Section>

        <Section title="5. Service Availability">
          <p>
            We aim for 99.5% monthly uptime, excluding scheduled maintenance. We will provide advance notice of
            scheduled downtime where reasonably possible. The Service is provided on an "<strong>as is</strong>"
            basis and we do not guarantee uninterrupted availability.
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            All intellectual property rights in the Service, including software, design, trademarks, and content,
            are owned by or licensed to RemiDesk. You are granted a limited, non-exclusive, non-transferable licence
            to use the Service during your active subscription period.
          </p>
          <p>
            You retain ownership of your business data (appointments, client names, etc.) that you enter into the
            Service. You grant us a limited licence to process that data solely to provide the Service.
          </p>
        </Section>

        <Section title="7. Data and Privacy">
          <p>
            Our collection and use of personal information is governed by our{' '}
            <Link to="/privacy" className="text-indigo-600 hover:underline">
              Privacy Policy
            </Link>
            , which forms part of these Terms.
          </p>
        </Section>

        <Section title="8. Limitations of Liability">
          <p>
            To the maximum extent permitted by applicable law, RemiDesk shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, including loss of profits, data, or business
            opportunities, arising from your use of the Service.
          </p>
          <p>
            Our total liability to you for any claim arising from the Service shall not exceed the amount you paid
            us in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="9. Dispute Resolution">
          <p>
            We encourage you to contact us first at{' '}
            <a href="mailto:support@remidesk.com" className="text-indigo-600 hover:underline">
              support@remidesk.com
            </a>{' '}
            to resolve any dispute informally.
          </p>
          <p>
            If a dispute cannot be resolved informally, it shall be governed by the laws of the jurisdiction where
            your business is registered (Canada, Australia, or England &amp; Wales for UK customers). Both parties
            submit to the exclusive jurisdiction of the courts of that territory.
          </p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>
            We may update these Terms from time to time. We will notify you by email and/or an in-app notice at
            least 14 days before material changes take effect. Continued use of the Service after changes constitute
            your acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="11. Contact">
          <address className="not-italic bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2 text-sm space-y-1">
            <p><strong>RemiDesk Support</strong></p>
            <p>
              Email:{' '}
              <a href="mailto:support@remidesk.com" className="text-indigo-600 hover:underline">
                support@remidesk.com
              </a>
            </p>
            <p>
              Privacy enquiries:{' '}
              <a href="mailto:privacy@remidesk.com" className="text-indigo-600 hover:underline">
                privacy@remidesk.com
              </a>
            </p>
          </address>
        </Section>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;

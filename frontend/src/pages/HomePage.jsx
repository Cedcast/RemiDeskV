import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate(isAuthenticated ? '/dashboard' : '/register');
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    navigate('/register');
  };

  return (
    <div className="bg-slate-50 text-slate-900">
      <div className="bg-white/80 backdrop-blur border-b border-slate-200/80 py-4 px-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-slate-900">RemiDesk</span>
          </Link>
          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="text-sm text-slate-600 hover:text-indigo-700">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  Start Free Trial
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="text-sm text-indigo-700 hover:underline">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="hero">
        <div className="container">
          <h1>Stop losing money from missed appointments.</h1>

          <p className="subheadline">
            Automatically remind your clients via SMS, WhatsApp &amp; email — so they actually show up.
          </p>

          <div className="cta">
            <button className="primary-btn" type="button" onClick={handleStartTrial}>
              Start Free Trial
            </button>
            <p className="small-text">
              ✔ No charge today &nbsp; ✔ 7-day free trial &nbsp; ✔ Cancel anytime
            </p>
          </div>

          <div className="demo-box">
            <p className="demo-label">Example reminder:</p>
            <div className="message-preview">
              “Hi James, just a quick reminder for your haircut tomorrow at 2PM 💈 — see you then!”
            </div>
          </div>

          <p className="target-text">
            Built for barbers, salons &amp; small businesses that take bookings by phone or WhatsApp.
          </p>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2>How it works</h2>

          <div className="steps">
            <div className="step">
              <h3>1. Add appointment</h3>
              <p>Enter your client’s name, time, and contact.</p>
            </div>

            <div className="step">
              <h3>2. We remind them</h3>
              <p>Automatic reminders sent via SMS, WhatsApp, or email.</p>
            </div>

            <div className="step">
              <h3>3. They show up</h3>
              <p>No more chasing clients or missed bookings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="container">
          <h2>Pricing Plans</h2>

          <div className="plans">
            <div className="plan">
              <h3>Starter</h3>
              <p className="price">$12 / month</p>
              <ul>
                <li>Up to 100 reminders/month</li>
                <li>SMS + WhatsApp + Email</li>
                <li>Support via chat</li>
              </ul>
              <button className="primary-btn" type="button" onClick={handleStartTrial}>
                Start Free Trial
              </button>
            </div>

            <div className="plan popular">
              <h3>Pro</h3>
              <p className="price">$39 / month</p>
              <ul>
                <li>Up to 1000 reminders/month</li>
                <li>Advanced analytics &amp; reporting</li>
                <li>Priority support</li>
              </ul>
              <button className="primary-btn" type="button" onClick={handleStartTrial}>
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="container">
          <h2>What early users say</h2>

          <div className="testimonial-cards">
            <div className="testimonial">
              <p>“RemiDesk stopped my clients from forgetting appointments — I love it!”</p>
              <span>- Alex, London Barber</span>
            </div>

            <div className="testimonial">
              <p>“The AI reminders feel real and professional. My no-shows dropped by 60%.”</p>
              <span>- Sarah, Manchester Salon</span>
            </div>
          </div>
        </div>
      </section>

      <section className="signup">
        <div className="container">
          <h2>Start your free trial today</h2>
          <form className="signup-form" onSubmit={handleSignupSubmit}>
            <input type="text" name="name" placeholder="Your Name" required />
            <input type="email" name="email" placeholder="Business Email" required />
            <input type="tel" name="phone" placeholder="Phone Number" required />
            <button className="primary-btn" type="submit">Start Free Trial</button>
          </form>
          <p className="small-text">
            ✔ No charge today &nbsp; ✔ 7-day free trial &nbsp; ✔ Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;

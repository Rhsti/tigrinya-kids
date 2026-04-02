import { Link } from "react-router-dom";
import "../styles/footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        
        <div className="footer-section">
          <h3>Tigrinya Kids</h3>
          <p>Structured, playful language learning for children and families.</p>
          <p className="footer-trust">Secure checkout powered by Stripe.</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>

        <div className="footer-section">
          <h4>Platform</h4>
          <p>Email: support@tigrinyakids.com</p>
          <p>Focused on course quality, progress tracking, and safe payments.</p>
        </div>

        <div className="footer-section">
          <h4>Legal</h4>
          <p>Privacy-first learning platform for families.</p>
          <p>© {currentYear} Tigrinya Kids. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;

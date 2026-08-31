import { HeroSection } from "../components/HeroSection";
import { LogoMark } from "../components/LogoMark";
import { WaitlistForm } from "../components/WaitlistForm";

const steps = [
  { number: "01", title: "A small moment of help", body: "When a parent gets stuck, they tap the ShowNext bubble instead of waiting for the next call." },
  { number: "02", title: "The screen becomes the question", body: "ShowNext looks at what is in front of them and keeps the explanation tied to the screen they can see." },
  { number: "03", title: "One clear next step", body: "A bright guide points to the control to try next. No maze of instructions, no guessing." },
];

export default function Home() {
  return (
    <main>
      <nav className="hero-nav shell" aria-label="Site">
        <a className="wordmark" href="#top">
          <LogoMark className="wordmark-mark" size={24} />
          ShowNext
        </a>
      </nav>

      <HeroSection />

      <section className="story shell" id="how-it-works">
        <div className="section-intro">
          <p className="eyebrow">The idea</p>
          <h2>
            Less explaining.
            <br />
            <em>More doing.</em>
          </h2>
          <p>ShowNext turns “what do I press?” into a small, visible next step — so technology can feel manageable again.</p>
        </div>
        <div className="steps">
          {steps.map((step) => (
            <article className="step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="promise shell">
        <div className="promise-card">
          <LogoMark className="promise-mark" size={56} />
          <p className="eyebrow">For the in-between moments</p>
          <h2>
            They get their next step.
            <br />
            <em>You get a little breathing room.</em>
          </h2>
          <p className="promise-copy">ShowNext is an early idea built around a simple belief: help should be close, even when family is not.</p>
        </div>
      </section>

      <section className="waitlist-cta shell" id="waitlist" aria-label="Join the waitlist">
        <p className="eyebrow">Stay close</p>
        <h2>
          Be first to try
          <br />
          <em>the helpful version.</em>
        </h2>
        <p className="waitlist-lede">Early access and launch updates — nothing else.</p>
        <WaitlistForm variant="pill" />
        <p className="hero-note">Launch updates only. No selling your email.</p>
      </section>

      <footer className="footer shell">
        <div className="footer-top">
          <a className="wordmark" href="#top">
            <LogoMark className="wordmark-mark" size={24} />
            ShowNext
          </a>
          <span>Made for the people who help us find the next step.</span>
        </div>
        <div className="footer-bottom">
          <p>
            © 2026 Shiv Pratap Singh · <a href="mailto:shiv.safari@gmail.com">Contact</a>
          </p>
          <p className="disclaimer">
            Created with assistance from AI tools. Visuals are illustrative. ShowNext is independent and not affiliated with or endorsed by any third-party app, platform, or company depicted.
          </p>
        </div>
      </footer>
    </main>
  );
}

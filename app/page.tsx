import { PhoneDemo } from "../components/PhoneDemo";
import { WaitlistForm } from "../components/WaitlistForm";

const steps = [
  { number: "01", title: "A small moment of help", body: "When a parent gets stuck, they tap the ShowNext bubble instead of waiting for the next call." },
  { number: "02", title: "The screen becomes the question", body: "ShowNext looks at what is in front of them and keeps the explanation tied to the screen they can see." },
  { number: "03", title: "One clear next step", body: "A bright guide points to the control to try next. No maze of instructions, no guessing." },
];

export default function Home() {
  return <main>
    <nav className="nav shell" aria-label="Main navigation"><a className="wordmark" href="#top" aria-label="ShowNext home"><span className="wordmark-mark" aria-hidden="true">›</span>ShowNext</a><a className="nav-link" href="#waitlist">Join the early list <span aria-hidden="true">↗</span></a></nav>
    <section className="hero shell" id="top"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> Early build for Android</p><h1>Help, right when they <em>need it.</em></h1><p className="hero-lede">ShowNext is being built for the moments when a parent is stuck on their phone and you cannot be there to walk them through it.</p><WaitlistForm /><p className="form-note">Launch and early-access updates only. No selling your email.</p><div className="hero-proof"><span>Made for real screens</span><i /><span>One step at a time</span><i /><span>Built with care</span></div></div><div className="hero-visual" aria-label="ShowNext phone demonstration"><div className="visual-note note-top"><span className="note-line" />The next step, made visible</div><PhoneDemo /><div className="visual-note note-bottom"><span className="note-star">✳</span> calm guidance, on screen</div></div></section>
    <section className="story shell" id="how-it-works"><div className="section-intro"><p className="eyebrow">The idea</p><h2>Less explaining.<br /><em>More doing.</em></h2><p>ShowNext turns “what do I press?” into a small, visible next step — so technology can feel manageable again.</p></div><div className="steps">{steps.map((step) => <article className="step" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>
    <section className="promise shell"><div className="promise-card"><span className="promise-mark" aria-hidden="true">✦</span><p className="eyebrow">For the in-between moments</p><h2>They get their next step.<br /><em>You get a little breathing room.</em></h2><p className="promise-copy">ShowNext is an early idea built around a simple belief: help should be close, even when family is not.</p><a className="text-link" href="#waitlist">Be part of the first build <span aria-hidden="true">→</span></a></div></section>
    <section className="final-cta shell" id="waitlist"><div><p className="eyebrow">Stay close</p><h2>We are building the<br /><em>first helpful version.</em></h2></div><div className="final-form"><p>Join the early list for product updates and a chance to try ShowNext first.</p><WaitlistForm /></div></section>
    <footer className="footer shell"><div className="footer-top"><a className="wordmark" href="#top"><span className="wordmark-mark" aria-hidden="true">›</span>ShowNext</a><span>Made for the people who help us find the next step.</span></div><div className="footer-bottom"><p>© 2026 Shiv Pratap Singh · <a href="mailto:shiv.safari@gmail.com">Contact</a></p><p className="disclaimer">Created with assistance from AI tools. Visuals are illustrative. ShowNext is independent and not affiliated with or endorsed by any third-party app, platform, or company depicted.</p></div></footer>
  </main>;
}

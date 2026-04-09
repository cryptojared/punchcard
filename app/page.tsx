import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#fffbeb]/90 backdrop-blur border-b border-[#fde68a]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#f59e0b] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">Loyaly</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="#how" className="text-[#57534e] hover:text-[#1c1917] transition-colors">How it works</Link>
            <Link href="#pricing" className="text-[#57534e] hover:text-[#1c1917] transition-colors">Pricing</Link>
            <Link href="/auth" className="text-sm px-4 py-2 rounded-lg hover:bg-[#fef3c7] transition-colors font-medium text-[#57534e]">Sign in</Link>
            <Link href="/auth?mode=signup" className="btn-primary text-sm">Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#fef3c7] border border-[#fde68a] rounded-full px-4 py-1.5 mb-6 text-sm text-[#b45309] font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            30-day free trial. Card charged on day 31.
          </div>

          <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1c1917', marginBottom: '1.25rem' }}>
            Your customers scan.<br />
            <span style={{ color: '#f59e0b' }}>You punch.</span><br />
            They come back.
          </h1>

          <p style={{ fontSize: '1.1875rem', color: '#57534e', maxWidth: '560px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
            The simplest digital loyalty card for coffee shops, salons, bars, and all the neighborhood spots that rely on repeat customers.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Link href="/auth?mode=signup" className="btn-primary" style={{ fontSize: '1.0625rem', padding: '0.75rem 1.75rem' }}>
              Get started — it's free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link href="#how" className="btn-secondary">
              See how it works
            </Link>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#a8a29e', marginBottom: '2rem' }}>
            Trusted by local businesses across the US
          </p>

          {/* Mock preview card */}
          <div style={{ maxWidth: '380px', margin: '0 auto', perspective: '1000px' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '2px solid #fde68a', padding: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b45309', fontWeight: 600 }}>Loyalty Card</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1c1917' }}>The Daily Grind</p>
                </div>
                <div style={{ width: '3rem', height: '3rem', background: '#f59e0b', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#57534e', marginBottom: '1rem' }}>
                Buy 10 coffees, get 1 free
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {[...Array(10)].map((_, i) => (
                  <div key={i} style={{
                    width: '2.25rem', height: '2.25rem',
                    borderRadius: '50%',
                    border: `2px solid ${i < 3 ? '#f59e0b' : '#fcd34d'}`,
                    background: i < 3 ? '#f59e0b' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i < 3 ? 'white' : '#d97706',
                    fontSize: '0.75rem', fontWeight: 700
                  }}>
                    {i < 3 ? '✓' : i + 1}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#b45309', fontWeight: 600, textAlign: 'center' }}>
                3 punches left — 3 more visits!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: '#ffffff', padding: '5rem 1.5rem' }}>
        <div className="max-w-4xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.75rem' }}>
              Up and running in 5 minutes
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#78716c' }}>
              No printers. No paper cards. No app downloads for your customers.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                num: "01",
                title: "Create your card",
                desc: "Set your punch count, define your reward, pick a name. That's it.",
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              },
              {
                num: "02",
                title: "Display the QR code",
                desc: "Print it, tape it to the counter, put it on a table tent. Your customers scan it once.",
                icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              },
              {
                num: "03",
                title: "Every visit, punched",
                desc: "Customer walks in, shows their phone, you tap punch. No app. No login. Just tap.",
                icon: "M5 13l4 4L19 7"
              },
            ].map((step) => (
              <div key={step.num} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', background: '#fef3c7', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                    </svg>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em' }}>{step.num}</span>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.9375rem', color: '#78716c', lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 1.5rem', background: '#fffbeb' }}>
        <div className="max-w-4xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.75rem' }}>
              Built for how local business works
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#78716c' }}>
              Not enterprise software shrunk down. Real tools for real shops.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { title: "No app downloads", desc: "Your customers scan a QR code. Their loyalty card lives in their phone's browser. No App Store. No account. No friction." },
              { title: "Tap to punch", desc: "Your staff doesn't need training. Open the card, tap punch, done. Works on any phone or tablet." },
              { title: "Smart completion", desc: "When a card is full, it glows. Your staff knows immediately. Redemption is one tap." },
              { title: "Customer keeps their spot", desc: "Cards don't expire — ever. A customer who hasn't been in for 6 months still has their loyalty card waiting for them." },
              { title: "Multiple cards", desc: "Run multiple promotions at once. A 10-punch coffee card, a 5-punch cocktail special, a birthday reward." },
            ].map((f) => (
              <div key={f.title} style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.125rem' }}>
                  <svg style={{ width: '0.875rem', height: '0.875rem', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.25rem' }}>{f.title}</p>
                  <p style={{ fontSize: '0.9375rem', color: '#78716c', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '5rem 1.5rem', background: '#ffffff' }}>
        <div className="max-w-3xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.75rem' }}>
              Simple pricing
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#78716c' }}>
              One plan. No seat limits. No surprises.
            </p>
          </div>

          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="card" style={{ border: '2px solid #f59e0b', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', borderRadius: '9999px', padding: '0.25rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, color: '#b45309', marginBottom: '1rem' }}>
                Most popular
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', justifyContent: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: '#1c1917' }}>$19.99</span>
                <span style={{ fontSize: '1.0625rem', color: '#78716c' }}>/month</span>
              </div>
              <p style={{ fontSize: '0.9375rem', color: '#78716c', marginBottom: '1.5rem' }}>$19.99/mo after 30-day free trial</p>
              <ul style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
                {[
                  "Unlimited loyalty cards",
                  "Unlimited customers",
                  "Unlimited punches",
                  "QR code per card",
                  "Redemption tracking",
                  "30-day free trial",
                ].map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9375rem', color: '#1c1917' }}>
                    <svg style={{ width: '1.125rem', height: '1.125rem', color: '#f59e0b', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth?mode=signup" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '0.875rem' }}>
                Start free trial
              </Link>
              <p style={{ fontSize: '0.8125rem', color: '#a8a29e', marginTop: '0.75rem' }}>Card required — 30 days free</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 1.5rem', background: '#f59e0b', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem' }}>
          Your best customers deserve to be remembered.
        </h2>
        <p style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>
          Start your free trial today. Set up takes 5 minutes.
        </p>
        <Link href="/auth?mode=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', color: '#d97706', padding: '0.875rem 2rem', borderRadius: '0.75rem', fontWeight: 700, fontSize: '1.0625rem', transition: 'transform 0.15s' }}>
          Get started free
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: '#1c1917', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: '#78716c' }}>
          © 2026 Loyaly. Made for local businesses.
        </p>
      </footer>
    </div>
  );
}

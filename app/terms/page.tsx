import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — COUNT',
  description: 'The terms and conditions for using COUNT.',
}

const UPDATED = 'June 26, 2026'

export default function TermsOfService() {
  return (
    <main
      style={{
        background: '#0E0D0C',
        color: '#C9C4BC',
        minHeight: '100vh',
        fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        padding: '48px 20px 80px',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');" +
            'a{color:#D47858;} h2{color:#F5F0EA;font-family:Archivo,sans-serif;font-size:20px;font-weight:800;margin:36px 0 12px;}' +
            'p,li{line-height:1.7;font-size:15px;color:#B0A89E;} li{margin-bottom:8px;} strong{color:#E8E2D9;}',
        }}
      />
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a
          href="/"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          ← Back to COUNT
        </a>

        <h1
          style={{
            fontFamily: 'Archivo, sans-serif',
            fontSize: 34,
            fontWeight: 900,
            color: '#F5F0EA',
            margin: '24px 0 6px',
          }}
        >
          Terms of Service
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#666' }}>
          Last updated: {UPDATED}
        </p>

        <p style={{ marginTop: 24 }}>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of COUNT, the fitness rewards
          application and website at countfitness.app (the &ldquo;Service&rdquo;), operated by COUNT
          (&ldquo;COUNT,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account or using
          the Service, you agree to these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be at least 13 years old to use COUNT. By using the Service, you represent that you meet this
          requirement and that the information you provide is accurate.
        </p>

        <h2>Your Account</h2>
        <p>
          You are responsible for the activity that occurs under your account and for keeping your login credentials
          secure. Provide accurate information and keep it up to date. Notify us promptly of any unauthorized use of your
          account.
        </p>

        <h2>Points and Rewards</h2>
        <ul>
          <li>
            <strong>No cash value.</strong> Points (also called coins) earned in COUNT have no monetary value, are not
            your property, and cannot be transferred, sold, or exchanged for cash.
          </li>
          <li>
            <strong>Earning.</strong> Points are awarded for verified workouts according to the rules in effect at the
            time. We may change earning rates, point values, tiers, multipliers, and the cost of rewards at any time.
          </li>
          <li>
            <strong>Redemption.</strong> Rewards are subject to availability and to the terms of our partner brands. We
            may add, modify, or discontinue rewards at any time.
          </li>
          <li>
            <strong>Fraud and abuse.</strong> We may adjust, withhold, void, or revoke points and may suspend or close
            accounts where we believe workouts are falsified or the Service is being gamed, abused, or used in violation
            of these Terms.
          </li>
        </ul>

        <h2>Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Falsify, fabricate, or manipulate workout data to earn points you did not legitimately earn.</li>
          <li>Use bots, scripts, or automated means to interact with the Service or to farm points.</li>
          <li>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or other accounts.</li>
          <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
        </ul>

        <h2>Connected Services</h2>
        <p>
          COUNT lets you connect third-party fitness services (such as Strava) to verify your workouts. Your use of those
          services is governed by their own terms and privacy policies. You are responsible for your accounts with those
          services, and you can disconnect them from the Service at any time.
        </p>

        <h2>Health and Fitness Disclaimer</h2>
        <p>
          COUNT is not a medical or healthcare provider, and the Service does not provide medical advice. Exercise carries
          inherent risks. Consult a qualified physician before beginning or changing any exercise program. You participate
          in physical activity at your own risk, and you are solely responsible for your health and safety.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          The Service, including its software, design, branding, and content, is owned by COUNT and protected by
          intellectual property laws. We grant you a limited, non-exclusive, non-transferable license to use the Service
          for its intended personal purpose. You may not copy, modify, or distribute any part of the Service without our
          permission.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind,
          whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure, or
          that workout verification will be accurate in every case.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, COUNT and its operators will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or for any loss of points, data, or rewards, arising
          out of or relating to your use of the Service.
        </p>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without notice, including for
          violation of these Terms. You may stop using the Service and request deletion of your account at any time.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date
          above. Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of New Jersey, United States, without regard to its conflict
          of laws rules.
        </p>

        <h2>Contact Us</h2>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a href="mailto:joseph.s.panepinto@countfitness.app">joseph.s.panepinto@countfitness.app</a>.
        </p>

        <p style={{ marginTop: 40, fontSize: 13, color: '#555' }}>
          &copy; {new Date().getFullYear()} COUNT. All rights reserved.
        </p>
      </div>
    </main>
  )
}

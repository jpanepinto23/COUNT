import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — COUNT',
  description: 'How COUNT collects, uses, and protects your information.',
}

const UPDATED = 'June 26, 2026'

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#666' }}>
          Last updated: {UPDATED}
        </p>

        <p style={{ marginTop: 24 }}>
          COUNT (&ldquo;COUNT,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the COUNT fitness
          rewards application and website at countfitness.app (the &ldquo;Service&rdquo;). This Privacy Policy explains
          what information we collect, how we use it, who we share it with, and the choices you have. By using the
          Service, you agree to the practices described here.
        </p>

        <h2>Information We Collect</h2>
        <p>We collect only what we need to run the Service:</p>
        <ul>
          <li>
            <strong>Account information</strong> — your name and email address when you sign up. You may optionally
            provide profile details such as age, height, or weight.
          </li>
          <li>
            <strong>Workout activity</strong> — the workouts you log or import, including type, duration, date, and (when
            available from a connected service) average heart rate and calories. This is used to award and verify points.
          </li>
          <li>
            <strong>Connected fitness services</strong> — if you connect a third-party service such as Strava (and, in
            the future, services like Garmin), we receive completed-activity summaries from that service to verify your
            workouts. We do not collect all-day health data, sleep data, or detailed GPS tracks.
          </li>
          <li>
            <strong>Rewards and referrals</strong> — your point balance, redemptions, tier, streaks, and referral
            activity.
          </li>
          <li>
            <strong>Technical data</strong> — basic information such as device and browser type, collected automatically
            to operate and secure the Service.
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To create and manage your account.</li>
          <li>To verify completed workouts and award points and rewards.</li>
          <li>To operate features like streaks, tiers, leaderboards, and referrals.</li>
          <li>To send you Service-related communications (for example, account or reward updates).</li>
          <li>To protect against fraud and abuse and to keep the Service secure.</li>
        </ul>

        <h2>Connected Services (Strava, Garmin, and similar)</h2>
        <p>
          When you connect a third-party fitness service, you authorize that service to share your completed-activity
          data with us through a secure authorization (OAuth) flow. We use this data solely to verify your workouts and
          award points. Access tokens and activity data are stored securely on our servers and are never shared with or
          exposed to other users. You can <strong>disconnect any service at any time</strong> from your profile, which
          revokes our access and stops further data collection from that service.
        </p>

        <h2>How We Share Information</h2>
        <p>We do not sell your personal information. We share it only as follows:</p>
        <ul>
          <li>
            <strong>Service providers</strong> — vendors who help us operate the Service, such as our database and
            hosting providers (Supabase and Vercel) and our email provider. They process data on our behalf under
            confidentiality obligations.
          </li>
          <li>
            <strong>Reward partners</strong> — when you redeem a reward, we facilitate fulfillment with the relevant
            partner brand. We share only what is necessary to complete your redemption.
          </li>
          <li>
            <strong>Legal and safety</strong> — when required by law, or to protect the rights, safety, and security of
            COUNT and our users.
          </li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We keep your information for as long as your account is active or as needed to provide the Service. You may
          request deletion of your account and associated data at any time (see &ldquo;Your Choices&rdquo; below), after
          which we delete or anonymize it, except where we must retain it to meet legal obligations.
        </p>

        <h2>Your Choices and Rights</h2>
        <ul>
          <li>Access or update your account information from within the app.</li>
          <li>Disconnect any linked fitness service at any time from your profile.</li>
          <li>Request a copy of your data, or request that we delete your account and data.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at the email below.
        </p>

        <h2>Security</h2>
        <p>
          We use industry-standard measures to protect your information, including encryption in transit, access
          controls, and restricting access to authorized systems. No method of transmission or storage is completely
          secure, but we work to protect your data and continually improve our safeguards.
        </p>

        <h2>Children&rsquo;s Privacy</h2>
        <p>
          COUNT is not directed to children under 13, and we do not knowingly collect personal information from them. If
          you believe a child has provided us information, please contact us and we will delete it.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
          date above. Material changes will be communicated through the Service.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or your data, contact us at{' '}
          <a href="mailto:joseph.s.panepinto@countfitness.app">joseph.s.panepinto@countfitness.app</a>.
        </p>

        <p style={{ marginTop: 40, fontSize: 13, color: '#555' }}>
          &copy; {new Date().getFullYear()} COUNT. All rights reserved.
        </p>
      </div>
    </main>
  )
}

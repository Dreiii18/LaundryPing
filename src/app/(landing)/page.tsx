import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Features } from '@/components/landing/features';
import { Pricing } from '@/components/landing/pricing';
import { Faq } from '@/components/landing/faq';
import { FinalCta } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://laundryping.com';

export const metadata: Metadata = {
  title: {
    absolute: 'LaundryPing - SMS Notifications for Philippine Laundromats',
  },
  description:
    'Automatically send SMS notifications to your laundromat customers when their laundry is done. Simple, fast, and built for the Philippines.',
  openGraph: {
    title: 'LaundryPing - SMS Notifications for Philippine Laundromats',
    description:
      'Automatically send SMS notifications to your laundromat customers when their laundry is done. Simple, fast, and built for the Philippines.',
    url: '/',
    type: 'website',
  },
  alternates: { canonical: '/' },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LaundryPing',
    url: siteUrl,
    logo: `${siteUrl}/laundryping-logo.png`,
    description: 'SMS notifications for Philippine laundromats',
    sameAs: [
      'https://www.facebook.com/share/18CNvPMTfH/',
      'https://www.instagram.com/laundry.ping',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LaundryPing',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Automatically send SMS notifications to your laundromat customers when their laundry is done.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'PHP',
      description: '50 free SMS/month included',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does the customer need an app?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. It works with SMS, so any phone can receive messages.',
        },
      },
      {
        '@type': 'Question',
        name: 'How fast is the setup?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Just a few minutes! Add your machines and you're ready to start.",
        },
      },
      {
        '@type': 'Question',
        name: 'Can I upgrade?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! You can upgrade anytime without losing your data.',
        },
      },
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

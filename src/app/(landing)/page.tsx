import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Features } from '@/components/landing/features';
import { Pricing } from '@/components/landing/pricing';
import { Faq } from '@/components/landing/faq';
import { FAQ_ITEMS } from '@/components/landing/faq-data';
import { FinalCta } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://laundryping.com';

export const metadata: Metadata = {
  title: {
    absolute: 'LaundryPing — Faster pickups for Philippine laundromats',
  },
  description:
    'Auto-text customers when their laundry is done. Pickups happen sooner, machines free up faster, and you take more loads — no app, no chasing.',
  openGraph: {
    title: 'LaundryPing — Faster pickups for Philippine laundromats',
    description:
      'Auto-text customers when their laundry is done. Pickups happen sooner, machines free up faster, and you take more loads — no app, no chasing.',
    url: siteUrl,
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
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
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

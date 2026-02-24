import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { DemoVideo } from '@/components/landing/demo-video';
import { Benefits } from '@/components/landing/benefits';
import { Faq } from '@/components/landing/faq';
import { FinalCta } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'LaundryPing - SMS Notifications for Philippine Laundromats',
  description:
    'Automatically send SMS notifications to your laundromat customers when their laundry is done. Simple, fast, and built for the Philippines.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <DemoVideo />
      <Benefits />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

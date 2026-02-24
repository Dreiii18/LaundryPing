import { ExplainerPlayer } from '@/components/explainer-video/explainer-player';

export function DemoVideo() {
  return (
    <section className="px-6 pt-24 pb-24 max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-[#111817] mb-3">
        Tingnan kung gaano kadali
      </h2>
      <p className="text-[#618986] mb-8">
        Isang minuto lang ang video na ito.
      </p>
      <ExplainerPlayer />
    </section>
  );
}

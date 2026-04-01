import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LaundryPing',
    short_name: 'LaundryPing',
    description: 'SMS notifications for Philippine laundromats',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f6f8fa',
    theme_color: '#0d968b',
    icons: [
      {
        src: '/laundryping-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

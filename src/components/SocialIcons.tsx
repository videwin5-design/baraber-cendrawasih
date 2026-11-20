import React from 'react';

// Official TikTok Vector Icon (SVG)
export const TikTokIcon: React.FC<{className?: string; size?: number}> = ({
  className = 'h-5 w-5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3 15.28 6.34 6.34 0 0 0 9.34 21.6a6.34 6.34 0 0 0 6.34-6.32V8.37a8.2 8.2 0 0 0 4.91 1.63V6.69z" />
  </svg>
);

// Official Google Maps (GM) Pin Vector Icon (SVG)
export const GoogleMapsIcon: React.FC<{className?: string; size?: number}> = ({
  className = 'h-5 w-5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    {/* Base Red Pin Body */}
    <path
      d="M12 2C8.13 2 5 5.13 5 9.17c0 5.43 6.32 12.23 6.59 12.52.23.25.59.25.82 0 .27-.29 6.59-7.09 6.59-12.52C19 5.13 15.87 2 12 2z"
      fill="#EA4335"
    />
    {/* Green Accent Shadow */}
    <path
      d="M12 21.69c-.11-.12-2.12-2.39-4.04-5.32A15.35 15.35 0 0 1 6.5 12.5C5.54 10.74 5 9.1 5 9.17 5 5.13 8.13 2 12 2v19.69z"
      fill="#D93025"
    />
    {/* White Central Circle Ring */}
    <circle cx="12" cy="9.2" r="3.6" fill="#FFFFFF" />
    {/* Blue Inner Center */}
    <circle cx="12" cy="9.2" r="2.2" fill="#1A73E8" />
  </svg>
);

// Official Instagram Icon (SVG with classic gradient support)
export const InstagramIcon: React.FC<{className?: string; size?: number}> = ({
  className = 'h-5 w-5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// Official Facebook Icon (SVG)
export const FacebookIcon: React.FC<{className?: string; size?: number}> = ({
  className = 'h-5 w-5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export interface SocialLinkItem {
  id: 'instagram' | 'tiktok' | 'facebook' | 'google_maps';
  name: string;
  handle: string;
  url: string;
  description: string;
  colorClass: string;
  hoverBgClass: string;
  badgeText?: string;
  icon: React.ReactNode;
}

export const OFFICIAL_SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@cendrawasih_barber',
    url: 'https://www.instagram.com/cendrawasih_barber',
    description: 'Portofolio potongan rambut, tren pompadour, fade & promo berkala',
    colorClass: 'text-[#E1306C] group-hover:text-[#E1306C]',
    hoverBgClass: 'hover:border-[#E1306C]/40 hover:bg-[#E1306C]/5',
    badgeText: 'Portofolio & Story',
    icon: <InstagramIcon className="h-5 w-5 text-[#E1306C]" />,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@cendrawasih_barber',
    url: 'https://www.tiktok.com/@cendrawasih_barber',
    description: 'Video transformasi rambut, teknik fade, styling tips & video viral studio',
    colorClass: 'text-[#00F2FE] group-hover:text-[#FE2C55]',
    hoverBgClass: 'hover:border-[#FE2C55]/40 hover:bg-[#FE2C55]/5',
    badgeText: 'Video Transformasi',
    icon: <TikTokIcon className="h-5 w-5 text-zinc-900 dark:text-white" />,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Barbershop Cendrawasih Nabire',
    url: 'https://www.facebook.com/cendrawasihbarber',
    description: 'Halaman resmi info komunitas, testimoni, pengumuman jadwal & cabang baru',
    colorClass: 'text-[#1877F2] group-hover:text-[#1877F2]',
    hoverBgClass: 'hover:border-[#1877F2]/40 hover:bg-[#1877F2]/5',
    badgeText: 'Halaman Resmi',
    icon: <FacebookIcon className="h-5 w-5 text-[#1877F2]" />,
  },
  {
    id: 'google_maps',
    name: 'Google Maps (GM)',
    handle: 'Barbershop Cendrawasih Oyehe',
    url: 'https://maps.google.com/?q=Barbershop+Cendrawasih+Jl.+Dr.+Sam+Ratulangi+Nabire',
    description: 'Ulasan bintang 4.9, panduan rute navigasi GPS real-time & foto lokasi',
    colorClass: 'text-[#EA4335] group-hover:text-[#EA4335]',
    hoverBgClass: 'hover:border-[#EA4335]/40 hover:bg-[#EA4335]/5',
    badgeText: 'Rating ★ 4.9 (Google)',
    icon: <GoogleMapsIcon className="h-5 w-5" />,
  },
];

// Compact Social Icon Buttons Bar for Navbar or Footer
export const CompactSocialButtons: React.FC<{className?: string}> = ({
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Instagram */}
      <a
        href="https://www.instagram.com/cendrawasih_barber"
        target="_blank"
        rel="noopener noreferrer"
        title="Instagram @cendrawasih_barber"
        aria-label="Instagram Barbershop Cendrawasih"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-all hover:border-[#E1306C] hover:bg-[#E1306C]/10 hover:text-[#E1306C] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-[#E1306C] hover:scale-110"
      >
        <InstagramIcon className="h-4 w-4" />
      </a>

      {/* TikTok */}
      <a
        href="https://www.tiktok.com/@cendrawasih_barber"
        target="_blank"
        rel="noopener noreferrer"
        title="TikTok @cendrawasih_barber"
        aria-label="TikTok Barbershop Cendrawasih"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 transition-all hover:border-black hover:bg-zinc-100 hover:text-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-white hover:scale-110"
      >
        <TikTokIcon className="h-4 w-4" />
      </a>

      {/* Facebook */}
      <a
        href="https://www.facebook.com/cendrawasihbarber"
        target="_blank"
        rel="noopener noreferrer"
        title="Facebook Barbershop Cendrawasih"
        aria-label="Facebook Barbershop Cendrawasih"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-all hover:border-[#1877F2] hover:bg-[#1877F2]/10 hover:text-[#1877F2] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-[#1877F2] hover:scale-110"
      >
        <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
      </a>

      {/* Google Maps (GM) */}
      <a
        href="https://maps.google.com/?q=Barbershop+Cendrawasih+Jl.+Dr.+Sam+Ratulangi+Nabire"
        target="_blank"
        rel="noopener noreferrer"
        title="Google Maps (GM) Barbershop Cendrawasih"
        aria-label="Google Maps Barbershop Cendrawasih"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-all hover:border-[#EA4335] hover:bg-[#EA4335]/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 hover:scale-110"
      >
        <GoogleMapsIcon className="h-4 w-4" />
      </a>
    </div>
  );
};

// Full Featured Social Media Cards Grid for Customer Portal
export const SocialMediaCardsGrid: React.FC<{className?: string}> = ({
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {OFFICIAL_SOCIAL_LINKS.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${item.hoverBgClass}`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              {item.badgeText && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.badgeText}
                </span>
              )}
            </div>

            <h4 className="font-display text-sm font-bold text-[#09090B] dark:text-white">
              {item.name}
            </h4>
            <p className="font-mono text-xs font-semibold text-[#C5922E] dark:text-[#DCA842] mt-0.5">
              {item.handle}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-[#C5922E] dark:group-hover:text-[#DCA842]">
            <span>Kunjungi {item.name}</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </a>
      ))}
    </div>
  );
};

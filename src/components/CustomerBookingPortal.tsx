import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Expand,
  ExternalLink,
  LayoutGrid,
  List,
  MapPin,
  Megaphone,
  Menu,
  Navigation,
  Pause,
  Phone,
  Play,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, {useMemo, useRef, useState} from 'react';
import type {Booking, Branch, Employee, OperationalSchedule, PostItem, ServiceItem, SiteMedia} from '../types.ts';
import {formatDateIndo, formatRupiah, getTodayISO} from '../utils/format.ts';
import {CompactSocialButtons, SocialMediaCardsGrid} from './SocialIcons.tsx';

interface CustomerBookingPortalProps {
  branches: Branch[];
  employees: Employee[];
  services: ServiceItem[];
  schedules: OperationalSchedule[];
  bookings: Booking[];
  posts: PostItem[];
  siteMedia?: SiteMedia;
  onLogoClick?: () => void;
  onBooked: (booking: Booking) => void;
  showBookingModal?: boolean;
  onCloseBookingModal?: () => void;
}

const CATEGORIES: ServiceItem['category'][] = ['HAIRCUT', 'HAIR PERMING', 'HAIR COLOR', 'STYLING'];
const POST_CATEGORIES: ('ALL' | PostItem['category'])[] = ['ALL', 'Promo', 'Gaya Rambut', 'Info Cabang', 'Pengumuman'];

export const CustomerBookingPortal: React.FC<CustomerBookingPortalProps> = ({
  branches,
  employees,
  services,
  schedules,
  bookings,
  posts,
  siteMedia,
  onLogoClick,
  onBooked,
  showBookingModal: showBookingModalProp = false,
  onCloseBookingModal,
}) => {
  const activeBranches = branches.filter((b) => b.is_active === 1);
  const activeServices = services.filter((s) => s.is_active === 1);
  const barbers = employees.filter((e) => e.role === 'karyawan' && e.is_active === 1);
  const publishedPosts = useMemo(() => posts.filter((p) => p.is_published === 1), [posts]);

  const [selectedBranchId, setSelectedBranchId] = useState(activeBranches[0]?.id || '');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(activeServices[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<ServiceItem['category'] | 'ALL'>('ALL');
  const [activePostCategory, setActivePostCategory] = useState<'ALL' | PostItem['category']>('ALL');
  const [bookingDate, setBookingDate] = useState(getTodayISO());
  const [bookingTime, setBookingTime] = useState('14:00');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [previewService, setPreviewService] = useState<ServiceItem | null>(null);
  const [previewGallery, setPreviewGallery] = useState<{title: string; caption: string; src: string} | null>(null);
  const [lookupCode, setLookupCode] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // State Katalog Model Rambut & Seni Garis Bertingkat
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<'HAIRCUT' | 'HAIR COLOR' | 'HAIR PERMING' | 'STYLING'>('HAIRCUT');
  const [selectedSpecificStyle, setSelectedSpecificStyle] = useState<{
    id: string;
    category: string;
    name: string;
    subname: string;
    description: string;
    tag: string;
    icon: string;
  } | null>(null);

  // Dynamic layout modes (Card Grid vs List View) controllable by Owner
  const [serviceViewMode, setServiceViewMode] = useState<'card' | 'list'>(siteMedia?.services_layout || 'card');
  const [barberViewMode, setBarberViewMode] = useState<'card' | 'list'>(siteMedia?.barbers_layout || 'card');
  const [postViewMode, setPostViewMode] = useState<'card' | 'list'>(siteMedia?.posts_layout || 'card');

  React.useEffect(() => {
    if (siteMedia?.services_layout) setServiceViewMode(siteMedia.services_layout);
  }, [siteMedia?.services_layout]);

  React.useEffect(() => {
    if (siteMedia?.barbers_layout) setBarberViewMode(siteMedia.barbers_layout);
  }, [siteMedia?.barbers_layout]);

  React.useEffect(() => {
    if (siteMedia?.posts_layout) setPostViewMode(siteMedia.posts_layout);
  }, [siteMedia?.posts_layout]);

  // Sync external prop into local state
  React.useEffect(() => {
    if (showBookingModalProp) setShowBookingModal(true);
  }, [showBookingModalProp]);

  const closeBookingModal = () => {
    setShowBookingModal(false);
    onCloseBookingModal?.();
  };

  // Autoplay video controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  const toggleVideoPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setVideoPlaying(true);
    } else {
      v.pause();
      setVideoPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    const v = videoRef.current;
    const nextMuted = !videoMuted;
    if (v) v.muted = nextMuted;
    setVideoMuted(nextMuted);
  };

  const selectedBranch = activeBranches.find((b) => b.id === selectedBranchId) || activeBranches[0];
  const branchBarbers = useMemo(() => {
    const matching = barbers.filter((b) => b.branch_id === selectedBranch?.id);
    return matching.length > 0 ? matching : barbers;
  }, [barbers, selectedBranch]);

  const effectiveBarberId = branchBarbers.some((b) => b.id === selectedBarberId)
    ? selectedBarberId
    : branchBarbers[0]?.id || '';

  const selectedDaySchedule = useMemo(() => {
    if (!selectedBranch || !bookingDate) return null;
    const d = new Date(`${bookingDate}T00:00:00`);
    const dow = d.getDay();
    return schedules.find((s) => s.branch_id === selectedBranch.id && s.day_of_week === dow) || null;
  }, [schedules, selectedBranch, bookingDate]);

  const timeSlots = useMemo(() => {
    if (selectedDaySchedule && selectedDaySchedule.is_open === 0) return [];
    const openStr = selectedDaySchedule?.open_time || selectedBranch?.open_time || '09:00';
    const closeStr = selectedDaySchedule?.close_time || selectedBranch?.close_time || '21:00';
    const startH = parseInt(openStr.split(':')[0] || '9', 10);
    const endH = parseInt(closeStr.split(':')[0] || '21', 10);
    const slots: string[] = [];
    for (let h = startH; h < endH; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }, [selectedDaySchedule, selectedBranch]);

  const filteredServices =
    activeCategory === 'ALL' ? activeServices : activeServices.filter((s) => s.category === activeCategory);

  const filteredPosts =
    activePostCategory === 'ALL' ? publishedPosts : publishedPosts.filter((p) => p.category === activePostCategory);

  const selectedService = activeServices.find((s) => s.id === selectedServiceId);

  const lookupResult = useMemo(() => {
    const q = lookupCode.trim().toLowerCase();
    if (!q) return [];
    return bookings.filter(
      (b) =>
        b.booking_code.toLowerCase().includes(q) ||
        b.customer_phone.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q)
    );
  }, [bookings, lookupCode]);

  const handleSelectBarberForBooking = (barber: Employee) => {
    setSelectedBarberId(barber.id);
    if (barber.branch_id) {
      setSelectedBranchId(barber.branch_id);
    }
    setShowBookingModal(true);
  };

  const getBarberBio = (name: string, specialty: string): string => {
    const n = name.toLowerCase();
    if (n.includes('udin')) {
      return 'Senior Barber Cendrawasih. Pakar potongan Haircut presisi (70k-150k), teknik pengeritingan modern Hair Perming (350k-635k), dan styling pomade pria profesional.';
    }
    if (n.includes('atta')) {
      return 'Master Capster dengan jam terbang tinggi. Berpengalaman dalam Modern Styling, Fade presisi, serta perawatan pangkas rambut pria lengkap.';
    }
    if (n.includes('noel')) {
      return 'Pro Capster ahli Haircut, Curly Perming, dan ritual Shaving silet hot towel. Sangat teliti dalam detail garis tepi rambut dan jenggot.';
    }
    if (n.includes('aswar')) {
      return 'Spesialis Classic Cut, Taper, dan perawatan Hair Tonic & Shampo yang menyegarkan serta menjaga kesehatan kulit kepala.';
    }
    if (n.includes('acel')) {
      return 'Spesialis Burst Fade, Hair Color / Pewarnaan Rambut (350k-550k), Bleaching, dan model rambut tren masa kini.';
    }
    if (n.includes('riyan')) {
      return 'Spesialis potongan modern dengan teknik blending fade ultra-halus (burst fade, low/mid fade, skin taper) serta ahli pewarnaan rambut pria dengan hasil gradasi rapi dan presisi.';
    }
    if (n.includes('budi')) {
      return 'Master haircut klasik dan ritual shaving silet handuk hangat (hot towel). Berpengalaman tinggi dalam layanan pengeritingan pria (curly perming wave) yang bertekstur alami.';
    }
    if (n.includes('rizky')) {
      return 'Pakar model rambut tren anak muda seperti French crop, two-block, comma hair, dan potongan rapi sekolah, instansi, maupun gaya kasual sehari-hari.';
    }
    if (n.includes('dimas')) {
      return 'Spesialis pewarnaan rambut advance (bleaching highlight, fashion color) serta penataan rambut bervolume dengan produk styling pomade dan perawatan hair tonic premium.';
    }
    return `Barber profesional berpengalaman dengan keahlian ${specialty || 'grooming pria'}, mengutamakan hasil potongan rapi dan simetris sesuai bentuk wajah Anda.`;
  };

  const getBarberFallbackImage = (name: string, photoUrl?: string | null): string => {
    if (photoUrl) return photoUrl;
    const n = name.toLowerCase();
    if (n.includes('udin')) return '/assets/setmore/studio-riyan.jpg';
    if (n.includes('atta')) return '/assets/setmore/studio-team.jpg';
    if (n.includes('noel')) return '/assets/setmore/studio-interior.jpg';
    if (n.includes('aswar')) return '/assets/setmore/srv-pm-pendek.jpg';
    if (n.includes('acel')) return '/assets/setmore/studio-riyan.jpg';
    if (n.includes('riyan')) return '/assets/setmore/studio-riyan.jpg';
    if (n.includes('budi')) return '/assets/setmore/studio-team.jpg';
    return '';
  };

  const handleUsePromo = (promoCode: string) => {
    setAppliedPromo(promoCode);
    setNotes((prev) => {
      const tag = `Kode Promo: ${promoCode}`;
      if (prev.includes(tag)) return prev;
      return prev.trim() ? `${prev.trim()} · ${tag}` : tag;
    });
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (selectedDaySchedule && selectedDaySchedule.is_open === 0) {
      setError('Cabang tutup pada tanggal yang dipilih. Silakan pilih tanggal lain.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          branch_id: selectedBranch?.id,
          barber_id: effectiveBarberId,
          service_id: selectedServiceId,
          customer_name: customerName,
          customer_phone: customerPhone,
          booking_date: bookingDate,
          booking_time: bookingTime,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal membuat reservasi');
      } else {
        setConfirmedBooking(data);
        setCustomerName('');
        setCustomerPhone('');
        setNotes('');
        setAppliedPromo('');
        onBooked(data);
      }
    } catch {
      setError('Gagal menghubungi server pemesanan');
    } finally {
      setSubmitting(false);
    }
  };

  const SPECIFIC_STYLES = [
    // HAIRCUT & SENI GARIS (LINE ART)
    {
      id: 'style-line-single',
      category: 'HAIRCUT',
      name: 'Single Razor Part Line',
      subname: 'Garis Belahan Pisau Cukur Tunggal',
      description: 'Aksen garis tajam presisi di belahan rambut membuat tatanan rambut tampak tegas, simetris, dan maskulin.',
      tag: 'Seni Garis Rambut',
      icon: '⚡',
    },
    {
      id: 'style-line-double',
      category: 'HAIRCUT',
      name: 'Double Parallel Lines',
      subname: 'Garis Ganda Paralel Presisi',
      description: 'Dua garis sejajar tipis di area pelipis atau belakang telinga, memberikan kesan sporty modern.',
      tag: 'Seni Garis Rambut',
      icon: '⚡',
    },
    {
      id: 'style-line-lightning',
      category: 'HAIRCUT',
      name: 'Zig-Zag Lightning Pattern',
      subname: 'Pola Garis Petir Artistik',
      description: 'Pola garis petir geometris custom pada fade samping, tren street style kekinian.',
      tag: 'Seni Garis Rambut',
      icon: '⚡',
    },
    {
      id: 'style-line-curve',
      category: 'HAIRCUT',
      name: 'Curved Arc Line Art',
      subname: 'Garis Lengkung Aerodinamis',
      description: 'Garis meliuk elegan mengikuti struktur lekukan tengkorak kepala dengan gradasi fade bersih.',
      tag: 'Seni Garis Rambut',
      icon: '⚡',
    },
    {
      id: 'style-cut-lowfade',
      category: 'HAIRCUT',
      name: 'Low Fade with Line Design',
      subname: 'Fade Rendah dengan Aksen Garis',
      description: 'Gradasi halus dari leher bawah naik bertahap, disempurnakan dengan garis minimalis di pelipis.',
      tag: 'Best Seller Fade',
      icon: '✂️',
    },
    {
      id: 'style-cut-taper',
      category: 'HAIRCUT',
      name: 'Mid Taper Fade Natural',
      subname: 'Taper Sedang Rapi Bersih',
      description: 'Hanya memudarkan area cambang dan tengkuk leher, bagian atas tetap panjang dan bervolume.',
      tag: 'Formal & Casual',
      icon: '✂️',
    },
    {
      id: 'style-cut-frenchcrop',
      category: 'HAIRCUT',
      name: 'Textured French Crop',
      subname: 'Crop Pendek Bertekstur Eropa',
      description: 'Poni depan dipotong tumpul rata dengan bagian atas dibuat bertekstur, sangat cocok untuk iklim tropis.',
      tag: 'Tren Terkini',
      icon: '✂️',
    },
    {
      id: 'style-cut-twoblock',
      category: 'HAIRCUT',
      name: 'Two-Block Korean Undercut',
      subname: 'Gaya Korea 2 Tingkat Natural',
      description: 'Sisi samping dipotong pendek rapi, rambut atas dibiarkan jatuh natural khas aktor Korea.',
      tag: 'K-Style Populer',
      icon: '✂️',
    },
    {
      id: 'style-cut-mullet',
      category: 'HAIRCUT',
      name: 'Modern Drop Fade Mullet',
      subname: 'Mullet Kontemporer Ramping',
      description: 'Perpaduan fade samping tajam dengan bagian ekor belakang dinamis bervolume.',
      tag: 'Retro Modern',
      icon: '✂️',
    },
    {
      id: 'style-cut-buzz',
      category: 'HAIRCUT',
      name: 'Military Buzz Cut Fade',
      subname: 'Potongan Cepak Presisi Militer',
      description: 'Panjang rambut seragam pendek dengan tepi garis hair line tajam di dahi.',
      tag: 'Super Praktis',
      icon: '✂️',
    },

    // HAIR COLOR (PEWARNAAN RAMBUT)
    {
      id: 'style-color-ashgrey',
      category: 'HAIR COLOR',
      name: 'Smokey Ash Grey Silver',
      subname: 'Abu-Abu Perak Metalik Dingin',
      description: 'Warna favorit premium dengan nuansa perak dingin elegan, memerlukan bleaching level 9+.',
      tag: 'Warna Premium',
      icon: '🎨',
    },
    {
      id: 'style-color-blonde',
      category: 'HAIR COLOR',
      name: 'Platinum Blonde White',
      subname: 'Pirang Platinum Terang',
      description: 'Warna pirang keputihan bercahaya tinggi untuk penampilan berani dan fashionable.',
      tag: 'High Bleach',
      icon: '🎨',
    },
    {
      id: 'style-color-highlight',
      category: 'HAIR COLOR',
      name: 'Frosted Tips Highlight',
      subname: 'Aksen Emas Ujung Rambut',
      description: 'Memberikan dimensi kedalaman warna rambut dengan mewarnai sebagian helai atas saja.',
      tag: 'Dimensi Warna',
      icon: '🎨',
    },
    {
      id: 'style-color-brown',
      category: 'HAIR COLOR',
      name: 'Warm Caramel Brown',
      subname: 'Cokelat Karamel Alami',
      description: 'Warna hangat natural tanpa perlu bleaching tinggi, cocok untuk warna kulit Indonesia.',
      tag: 'Natural Warm',
      icon: '🎨',
    },

    // HAIR PERMING (PENGELOLAAN TEKSTUR & IKAL)
    {
      id: 'style-perm-wave',
      category: 'HAIR PERMING',
      name: 'Korean Wave Perm',
      subname: 'Gelombang Ikal Alami K-Drama',
      description: 'Menciptakan gelombang rambut alami agar rambut mudah ditata dan bervolume sepanjang hari.',
      tag: 'K-Perming',
      icon: '🌀',
    },
    {
      id: 'style-perm-down',
      category: 'HAIR PERMING',
      name: 'Down Perm Samping',
      subname: 'Merapikan Rambut Jabrik Samping',
      description: 'Menekan rambut samping yang mengembang atau kaku agar menempel rapi ke kulit kepala.',
      tag: 'Solusi Rambut Kaku',
      icon: '🌀',
    },
    {
      id: 'style-perm-spiral',
      category: 'HAIR PERMING',
      name: 'Textured Spiral Curl Perm',
      subname: 'Keriting Spiral Penuh Karakter',
      description: 'Memberikan tekstur keriting spiral tegas dan tebal untuk penampilan berjiwa seni.',
      tag: 'Bold Style',
      icon: '🌀',
    },

    // STYLING & TREATMENT
    {
      id: 'style-style-pomade',
      category: 'STYLING',
      name: 'Slick Back Pomade Finish',
      subname: 'Kilau Rapi Formal Klimis',
      description: 'Penataan rambut klimis formal dengan pomade premium berdaya rekat tinggi.',
      tag: 'Gentleman Classic',
      icon: '✨',
    },
    {
      id: 'style-style-clay',
      category: 'STYLING',
      name: 'Matte Clay Messy Textured',
      subname: 'Natural Bertekstur Tanpa Kilau',
      description: 'Tekstur acak natural bervolume menggunakan matte clay tanpa efek mengkilap.',
      tag: 'Casual Everyday',
      icon: '✨',
    },
  ];

  const handleSelectServiceWithCatalog = (svc: ServiceItem) => {
    setSelectedServiceId(svc.id);
    const cat = svc.category.toUpperCase();
    if (cat.includes('COLOR')) setCatalogCategoryFilter('HAIR COLOR');
    else if (cat.includes('PERM')) setCatalogCategoryFilter('HAIR PERMING');
    else if (cat.includes('STYLE')) setCatalogCategoryFilter('STYLING');
    else setCatalogCategoryFilter('HAIRCUT');
    setShowStyleModal(true);
  };

  const handleApplySpecificStyle = (style: typeof SPECIFIC_STYLES[0]) => {
    setSelectedSpecificStyle(style);
    // Tambahkan catatan model ke kolom catatan
    setNotes((prev) => {
      const cleanPrev = prev.replace(/\[Model:.*?\]/g, '').trim();
      return cleanPrev ? `${cleanPrev} [Model: ${style.name}]` : `[Model: ${style.name}]`;
    });
    // Sesuaikan pilihan layanan jika diperlukan
    const matchingSvc = activeServices.find((s) => s.category.toUpperCase() === style.category);
    if (matchingSvc) {
      setSelectedServiceId(matchingSvc.id);
    }
    setShowStyleModal(false);
    const el = document.getElementById('formulir-reservasi');
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const videoUrl = siteMedia?.hero_video_url || '/assets/cendrawasih_showcase.mp4';
  const videoTitle = siteMedia?.hero_video_title || 'Presisi Pangkas & Ritual Grooming Cenderawasih';
  const videoSubtitle =
    siteMedia?.hero_video_subtitle ||
    'Jl. Dr. Sam Ratulangi & Jl. Yos Sudarso, Oyehe, Nabire, Papua Tengah · Buka Senin–Sabtu 10.00–22.00 WIT.';
  const videoPoster = siteMedia?.hero_video_poster || '/assets/setmore/studio-interior.jpg';

  return (
    <div className="space-y-10">
      {/* Editorial Hero Split + Autoplay Showcase Video */}
      <section id="hero" className="rounded-2xl bg-[#09090B] text-white overflow-hidden border border-zinc-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between gap-8">
            <div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => onLogoClick?.()}
                  aria-label="Barbershop Cenderawasih"
                  className="bg-transparent border-0 p-0 text-left cursor-pointer group"
                >
                  <img
                    src="/assets/brand-logo.png"
                    alt="Logo Resmi Barbershop Cenderawasih"
                    referrerPolicy="no-referrer"
                    className="h-16 sm:h-20 w-auto object-contain object-left bg-transparent transition-transform duration-150 group-hover:scale-[1.02] filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                  />
                </button>
                <span className="text-xs font-medium text-zinc-400 tracking-wide">
                  Oyehe, Nabire · Papua Tengah
                </span>
              </div>

              <h1 className="mt-6 font-brand text-3xl sm:text-4xl font-bold leading-tight text-balance tracking-tight">
                Potongan Presisi, Reservasi Online Tanpa Antre
              </h1>
              <p className="mt-3 max-w-xl text-sm sm:text-base text-zinc-300 leading-relaxed">
                Pilih cabang terdekat, lihat contoh potongan langsung dari studio kami, dan tentukan barber favorit Anda sebelum datang.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#formulir-reservasi"
                  className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#09090B] hover:bg-zinc-100 shadow-xs"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Pesan Kursi Sekarang</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPosterModal(true)}
                  className="btn-tactile inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <Scissors className="h-4 w-4 text-[#DCA842]" />
                  <span>Poster Daftar Harga</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4 text-xs">
                <div>
                  <p className="font-mono text-base font-bold text-white tabular-nums">{activeBranches.length}</p>
                  <p className="text-zinc-400">Cabang Aktif</p>
                </div>
                <div>
                  <p className="font-mono text-base font-bold text-[#DCA842] tabular-nums">{barbers.length}</p>
                  <p className="text-zinc-400">Barber Terlatih</p>
                </div>
                <div>
                  <p className="font-mono text-base font-bold text-white tabular-nums">{activeServices.length}</p>
                  <p className="text-zinc-400">Pilihan Layanan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Autoplay Looping Showcase Video */}
          <div className="lg:col-span-6 relative bg-[#050507] min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-hidden">
            <video
              key={videoUrl}
              ref={videoRef}
              src={videoUrl}
              poster={videoPoster}
              autoPlay
              muted={videoMuted}
              loop
              playsInline
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              className="h-full w-full object-cover"
            />
            {/* Measured Contrast Scrim */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050507]/95 via-[#050507]/30 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#DCA842]">Tayangan Studio Cendrawasih</p>
                <h2 className="mt-1 font-display text-base sm:text-lg font-bold text-white leading-snug">
                  {videoTitle}
                </h2>
                <p className="mt-1 text-xs text-zinc-200 leading-relaxed line-clamp-2 max-w-md">{videoSubtitle}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleVideoPlay}
                  className="btn-tactile flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-[#050507]/80 text-white hover:bg-[#09090B] backdrop-blur-xs cursor-pointer"
                  aria-label={videoPlaying ? 'Jeda video' : 'Putar video'}
                  title={videoPlaying ? 'Jeda video' : 'Putar video'}
                >
                  {videoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleVideoMute}
                  className="btn-tactile flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-[#050507]/80 text-white hover:bg-[#09090B] backdrop-blur-xs cursor-pointer"
                  aria-label={videoMuted ? 'Nyalakan suara video' : 'Bisukan suara video'}
                  title={videoMuted ? 'Nyalakan suara' : 'Bisukan suara'}
                >
                  {videoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TENTANG KAMI SECTION ===================== */}
      {siteMedia?.show_about !== false && (
        <section id="tentang-kami" className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 sm:p-8 space-y-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C5922E]/30 bg-[#C5922E]/10 px-3 py-1 text-xs font-semibold text-[#09090B] dark:text-[#DCA842]">
              <Sparkles className="h-3.5 w-3.5 text-[#C5922E] dark:text-[#DCA842]" />
              <span>TENTANG KAMI · SEJAK 2024</span>
            </div>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-[#09090B] dark:text-white leading-tight">
              {siteMedia?.about_title || 'Dedikasi Seni Potong Rambut & Ritual Grooming Pria Modern di Nabire'}
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {siteMedia?.about_description ||
                'Barbershop Cenderawasih didirikan dengan komitmen menghadirkan standar pemangkasan rambut pria berkualitas tinggi di Nabire, Papua Tengah. Menggabungkan teknik potong presisi, peralatan higienis berstandar salon modern, serta suasana studio ber-AC yang nyaman untuk setiap pengunjung.'}
            </p>
          </div>

          {/* 3 Pilar Keunggulan Utama */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#09090B] text-[#DCA842] dark:bg-zinc-700">
                <Scissors className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                Teknik Presisi &amp; Fade Halus
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Keahlian blending fade (low, mid, burst), skin taper, textured crop, hingga gaya klasik rapi disesuaikan dengan kontur kepala dan jenis rambut Anda.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#09090B] text-[#DCA842] dark:bg-zinc-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                Higienis &amp; Silet Sekali Pakai
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Sterilisasi alat pemangkas sebelum dan sesudah penggunaan, penggantian silet baru untuk tiap pelanggan, serta handuk hangat yang bersih dan segar.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 p-5 space-y-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#09090B] text-[#DCA842] dark:bg-zinc-700">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                Layanan Menyeluruh (All-In-One)
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Tidak hanya potong rambut: nikmati Hair Perming wave Korea, pewarnaan rambut (highlight/bleach), ritual handuk hangat, facial scrub, dan styling pomade.
              </p>
            </div>
          </div>

          {/* Info Cabang & Kemudahan Fasilitas */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#09090B] text-white p-5 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="border-r border-zinc-800 last:border-0 pr-2">
                <p className="font-mono text-2xl font-bold text-[#DCA842] tabular-nums">2 Cabang</p>
                <p className="mt-1 text-xs text-zinc-400">Jl. Sam Ratulangi &amp; Jl. Yos Sudarso</p>
              </div>
              <div className="border-r border-zinc-800 last:border-0 pr-2">
                <p className="font-mono text-2xl font-bold text-white tabular-nums">100%</p>
                <p className="mt-1 text-xs text-zinc-400">Steril &amp; Higienis Terjamin</p>
              </div>
              <div className="border-r border-zinc-800 last:border-0 pr-2">
                <p className="font-mono text-2xl font-bold text-[#DCA842] tabular-nums">14+ Menu</p>
                <p className="mt-1 text-xs text-zinc-400">Pilihan Perawatan &amp; Styling</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-white tabular-nums">Realtime</p>
                <p className="mt-1 text-xs text-zinc-400">Reservasi Online Langsung</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================== BARBER KAMI SECTION ===================== */}
      {siteMedia?.show_barbers !== false && (
        <section id="barber-kami" className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C5922E]/30 bg-[#C5922E]/10 px-3 py-1 text-xs font-semibold text-[#09090B] dark:text-[#DCA842]">
                <Users className="h-3.5 w-3.5 text-[#C5922E] dark:text-[#DCA842]" />
                <span>TIM BARBER PROFESIONAL</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#09090B] dark:text-white">
                {siteMedia?.barbers_title || 'Barber Pilihan & Penjelasan Keahlian'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {siteMedia?.barbers_subtitle ||
                  'Kenali barber kami, lihat spesialisasi potongan rambutnya, dan pilih langsung untuk pemesanan kursi'}
              </p>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {/* Layout Switcher (Card vs List) */}
              <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setBarberViewMode('card')}
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    barberViewMode === 'card'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="Tata Letak: Card (Grid)"
                  aria-label="Tampilan Card"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBarberViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    barberViewMode === 'list'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="Tata Letak: List (Daftar)"
                  aria-label="Tampilan List"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-[#DCA842] shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Pesan Kursi Sekarang</span>
              </button>
            </div>
          </div>

          {/* Barber View: CARD (GRID) */}
          {barberViewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {barbers.map((barber) => {
                const branchName = branches.find((b) => b.id === barber.branch_id)?.name || 'Semua Cabang';
                const barberBio = getBarberBio(barber.name, barber.specialty);
                const avatarSrc = getBarberFallbackImage(barber.name, barber.photo_url);

                return (
                  <div
                    key={barber.id}
                    className="card-tactile card-rgb-shadow rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-150"
                  >
                    <div>
                      {/* Photo / Avatar Header */}
                      <div className="relative aspect-[4/3] w-full bg-[#09090B] overflow-hidden">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={`Foto Barber ${barber.name}`}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#09090B] to-[#27272A] text-white">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#DCA842] bg-[#09090B] text-2xl font-bold text-[#DCA842]">
                              {barber.name.slice(0, 1)}
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#09090B]/85 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs border border-white/10">
                            <Star className="h-3 w-3 text-[#DCA842] fill-[#DCA842]" /> Barber Unggulan
                          </span>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="p-4 space-y-2.5">
                        <div>
                          <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                            {barber.name}
                          </h3>
                          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C5922E] dark:text-[#DCA842] mt-0.5">
                            <Scissors className="h-3 w-3" />
                            <span>{barber.specialty}</span>
                          </p>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                          {barberBio}
                        </p>

                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <MapPin className="h-3.5 w-3.5 text-[#09090B] dark:text-[#DCA842] shrink-0" />
                          <span className="truncate">{branchName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        onClick={() => handleSelectBarberForBooking(barber)}
                        className="btn-tactile w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#09090B] bg-[#09090B] hover:bg-zinc-800 dark:border-[#C5922E] dark:bg-[#C5922E] dark:hover:bg-[#DCA842] px-3 py-2 text-xs font-semibold text-white dark:text-zinc-950 cursor-pointer shadow-xs"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Pilih {barber.name.split(' ')[0]} &amp; Pesan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Barber View: LIST (DAFTAR) */
            <div className="space-y-3">
              {barbers.map((barber) => {
                const branchName = branches.find((b) => b.id === barber.branch_id)?.name || 'Semua Cabang';
                const barberBio = getBarberBio(barber.name, barber.specialty);
                const avatarSrc = getBarberFallbackImage(barber.name, barber.photo_url);

                return (
                  <div
                    key={barber.id}
                    className="card-tactile card-rgb-shadow rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-[#09090B] shrink-0 border border-zinc-200 dark:border-zinc-700">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={`Foto Barber ${barber.name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-lg text-[#DCA842]">
                            {barber.name.slice(0, 1)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">
                            {barber.name}
                          </h3>
                          <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-[#C5922E] dark:text-[#DCA842] flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" /> 5.0
                          </span>
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                            {branchName}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#C5922E] dark:text-[#DCA842]">
                          {barber.specialty}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 max-w-2xl leading-relaxed">
                          {barberBio}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleSelectBarberForBooking(barber)}
                        className="btn-tactile w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-[#DCA842] cursor-pointer whitespace-nowrap shadow-xs"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Pesan Kursi dengan {barber.name.split(' ')[0]}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Latest Posts, Promos & Branch Announcements */}
      {siteMedia?.show_promo !== false && publishedPosts.length > 0 && (
        <section id="promo" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#09090B] dark:text-white">
                {siteMedia?.posts_title || 'Postingan Terbaru & Info Promo'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {siteMedia?.posts_subtitle ||
                  'Promo potongan terbaru, inspirasi gaya rambut, dan pengumuman resmi dari Owner Cendrawasih'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
                {POST_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActivePostCategory(cat)}
                    className={`btn-tactile rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      activePostCategory === cat
                        ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-[#09090B] dark:text-zinc-300 dark:hover:text-white'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua' : cat}
                  </button>
                ))}
              </div>

              {/* Tombol Buka Katalog Model Rambut & Garis */}
              <button
                type="button"
                onClick={() => setShowStyleModal(true)}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#DCA842]/50 bg-[#DCA842]/10 px-3 py-1.5 text-xs font-bold text-[#DCA842] hover:bg-[#DCA842]/20 cursor-pointer"
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>Katalog Model &amp; Garis</span>
              </button>

              {/* Layout Switcher (Card Grid vs List View) */}
              <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setPostViewMode('card')}
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    postViewMode === 'card'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="Tata Letak: Card (Grid)"
                  aria-label="Tampilan Card Promo"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPostViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    postViewMode === 'list'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="Tata Letak: List (Daftar)"
                  aria-label="Tampilan List Promo"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Belum ada postingan untuk kategori {activePostCategory}.
            </div>
          ) : postViewMode === 'card' ? (
            /* Post View: CARD (GRID) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="group card-tactile rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-[#09090B] overflow-hidden relative">
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#09090B] to-[#27272A] text-white/75">
                          <Megaphone className="h-8 w-8 text-[#DCA842]" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-[#C5922E] dark:text-[#DCA842]">{post.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateIndo(post.created_at.slice(0, 10))}</span>
                        {post.is_pinned === 1 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#09090B] dark:text-zinc-200">Pilihan Utama</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{post.content}</p>
                    </div>
                  </div>

                  {(post.promo_code || post.valid_until) && (
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 bg-zinc-50/70 dark:bg-zinc-800/40">
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                        {post.promo_code && (
                          <span className="font-mono font-bold text-[#09090B] dark:text-[#DCA842]">
                            {post.promo_code}
                          </span>
                        )}
                        {post.promo_code && post.valid_until && <span className="mx-1.5 text-zinc-400">·</span>}
                        {post.valid_until && <span>s/d {formatDateIndo(post.valid_until)}</span>}
                      </div>
                      {post.promo_code && (
                        <button
                          type="button"
                          onClick={() => handleUsePromo(post.promo_code)}
                          className="btn-tactile inline-flex items-center gap-1 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer whitespace-nowrap"
                        >
                          <Tag className="h-3 w-3" />
                          <span>Pakai Promo</span>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            /* Post View: LIST (DAFTAR) */
            <div className="space-y-3.5">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="group card-tactile rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-lg overflow-hidden bg-[#09090B] relative">
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#09090B] to-[#27272A] text-white/70">
                          <Megaphone className="h-6 w-6 text-[#DCA842]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-[#C5922E] dark:text-[#DCA842]">{post.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateIndo(post.created_at.slice(0, 10))}</span>
                        {post.is_pinned === 1 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#09090B] dark:text-zinc-200">Pilihan Utama</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-2">
                        {post.content}
                      </p>
                      {(post.promo_code || post.valid_until) && (
                        <div className="pt-1 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                          {post.promo_code && (
                            <span className="font-mono font-bold text-[#09090B] dark:text-[#DCA842]">
                              Kode: {post.promo_code}
                            </span>
                          )}
                          {post.valid_until && <span>· Berlaku s/d {formatDateIndo(post.valid_until)}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {post.promo_code && (
                    <button
                      type="button"
                      onClick={() => handleUsePromo(post.promo_code)}
                      className="btn-tactile shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span>Pakai Promo</span>
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Main Booking + Official Price List with Haircut Examples */}
      {siteMedia?.show_services !== false && (
      <div id="layanan" className="grid grid-cols-1 gap-6 items-start">
        {/* Service Price List with Example Photos - full width */}
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white">
                {siteMedia?.services_title || 'Daftar Layanan & Harga Resmi'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {siteMedia?.services_subtitle ||
                  'Pilih layanan untuk pemesanan · Klik foto untuk melihat detail contoh potongan'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory('ALL')}
                  className={`btn-tactile rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    activeCategory === 'ALL'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                  }`}
                >
                  Semua
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`btn-tactile rounded-md px-2.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      activeCategory === cat
                        ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Tombol Buka Katalog Model Rambut & Garis */}
              <button
                type="button"
                onClick={() => setShowStyleModal(true)}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#DCA842]/50 bg-[#DCA842]/10 px-3 py-1.5 text-xs font-bold text-[#DCA842] hover:bg-[#DCA842]/20 cursor-pointer"
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>Katalog Model &amp; Garis</span>
              </button>

              {/* Layout Switcher (Card Grid vs List View) */}
              <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
                <button
                  type="button"
                  onClick={() => setServiceViewMode('card')}
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    serviceViewMode === 'card'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="Tata Letak: Card (Grid)"
                  aria-label="Tampilan Card Layanan"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setServiceViewMode('list')}
                  className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                    serviceViewMode === 'list'
                      ? 'bg-[#09090B] text-white dark:bg-[#C5922E] dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title="Tata Letak: List (Daftar)"
                  aria-label="Tampilan List Layanan"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {serviceViewMode === 'card' ? (
            /* Services View: CARD (GRID) */
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredServices.map((svc) => {
                const isSelected = svc.id === selectedServiceId;
                return (
                  <div
                    key={svc.id}
                    className={`group card-tactile rounded-xl border overflow-hidden flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-[#09090B] bg-[#09090B]/[0.03] ring-1 ring-[#09090B] dark:border-[#DCA842] dark:bg-[#DCA842]/[0.08] dark:ring-[#DCA842]'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Thumbnail Contoh Potongan */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#09090B]">
                      {svc.image_url ? (
                        <img
                          src={svc.image_url}
                          alt={`Contoh potongan ${svc.name}`}
                          referrerPolicy="no-referrer"
                          onClick={() => setPreviewService(svc)}
                          className="h-full w-full object-cover cursor-pointer transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div
                          onClick={() => setSelectedServiceId(svc.id)}
                          className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#09090B] to-[#27272A] text-white/80 cursor-pointer"
                        >
                          <Scissors className="h-6 w-6 text-[#DCA842]" />
                          <span className="text-[11px] font-medium text-zinc-300">{svc.category}</span>
                        </div>
                      )}

                      {svc.image_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewService(svc)}
                          className="btn-tactile absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-[#050507]/80 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#09090B] backdrop-blur-xs cursor-pointer"
                          aria-label={`Perbesar contoh ${svc.name}`}
                        >
                          <Expand className="h-3 w-3 text-[#DCA842]" />
                          <span>Lihat Contoh</span>
                        </button>
                      )}
                    </div>

                    {/* Card Details & Select Handler */}
                    <button
                      type="button"
                      onClick={() => handleSelectServiceWithCatalog(svc)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-sm font-bold text-[#09090B] dark:text-white truncate">
                            {svc.name}
                          </span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-[#09090B] dark:text-[#DCA842] shrink-0" />}
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {svc.category} · {svc.duration_minutes} menit
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#09090B] dark:text-[#DCA842] tabular-nums shrink-0">
                        {formatRupiah(svc.price)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Services View: LIST (DAFTAR) */
            <div className="mt-5 space-y-2.5">
              {filteredServices.map((svc) => {
                const isSelected = svc.id === selectedServiceId;
                return (
                  <div
                    key={svc.id}
                    className={`group card-tactile rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'border-[#09090B] bg-[#09090B]/[0.03] ring-1 ring-[#09090B] dark:border-[#DCA842] dark:bg-[#DCA842]/[0.08] dark:ring-[#DCA842]'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        onClick={() => svc.image_url ? setPreviewService(svc) : setSelectedServiceId(svc.id)}
                        className="h-16 w-16 sm:h-18 sm:w-18 shrink-0 rounded-lg overflow-hidden bg-[#09090B] cursor-pointer relative group-hover:opacity-95"
                      >
                        {svc.image_url ? (
                          <img
                            src={svc.image_url}
                            alt={svc.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#09090B] to-[#27272A] text-[#DCA842]">
                            <Scissors className="h-5 w-5" />
                          </div>
                        )}
                        {svc.image_url && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 p-0.5 text-white">
                            <Expand className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-sm font-bold text-[#09090B] dark:text-white truncate">
                            {svc.name}
                          </h4>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-[#09090B] dark:text-[#DCA842] shrink-0" />}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span className="font-semibold text-[#C5922E] dark:text-[#DCA842]">{svc.category}</span>
                          <span className="mx-1.5">·</span>
                          <span>Estimasi {svc.duration_minutes} menit</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                      <span className="font-mono text-base font-bold text-[#09090B] dark:text-[#DCA842] tabular-nums">
                        {formatRupiah(svc.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectServiceWithCatalog(svc)}
                        className={`btn-tactile inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                            : 'bg-[#09090B] text-white hover:bg-zinc-800 dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842]'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Dipilih</span>
                          </>
                        ) : (
                          <span>Pilih Layanan</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking Status Lookup - dibawah daftar layanan */}
        <div id="cek-booking" className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6">
          <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white">Cek Status Antrean &amp; Booking</h3>
          <div className="mt-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="Cari kode booking (CENDRA-101) atau nama..."
              className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
            />
          </div>
          <div className="mt-3 space-y-2">
            {(lookupCode.trim() ? lookupResult : bookings.slice(0, 3)).map((bk) => (
              <div key={bk.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 px-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[#09090B] dark:text-white truncate">
                    <span className="font-mono">{bk.booking_code}</span> · {bk.customer_name}
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 truncate">
                    {bk.service_name} · {bk.barber_name} · {bk.booking_date} {bk.booking_time}
                  </p>
                </div>
                <span className={`shrink-0 font-semibold ${
                  bk.status === 'Selesai' ? 'text-emerald-700 dark:text-emerald-400'
                    : bk.status === 'Dikonfirmasi' ? 'text-[#09090B] dark:text-[#DCA842]'
                    : bk.status === 'Dibatalkan' ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {bk.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ===== BOOKING FORM MODAL ===== */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg my-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 bg-[#09090B] px-5 py-4 rounded-t-2xl">
              <div>
                <h2 className="font-display text-sm font-bold text-white">Formulir Pemesanan Online</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">Terkoneksi langsung dengan sistem kasir cabang</p>
              </div>
              <button
                type="button"
                onClick={closeBookingModal}
                className="btn-tactile rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Tutup formulir pemesanan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {appliedPromo && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#C5922E]/40 bg-[#C5922E]/10 px-3.5 py-2 text-xs text-[#09090B] dark:text-[#DCA842]">
                  <span>
                    Promo <strong className="font-mono">{appliedPromo}</strong> siap diterapkan pada catatan reservasi.
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedPromo('')}
                    className="opacity-70 hover:opacity-100 cursor-pointer"
                    aria-label="Hapus tanda promo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {confirmedBooking && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Reservasi Berhasil Terkirim</p>
                      <p className="mt-1 font-mono text-lg font-bold text-emerald-950 dark:text-white">{confirmedBooking.booking_code}</p>
                    </div>
                    <button type="button" onClick={() => setConfirmedBooking(null)} className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 cursor-pointer">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    {confirmedBooking.customer_name} · {confirmedBooking.service_name} dengan{' '}
                    <strong>{confirmedBooking.barber_name}</strong> pada {formatDateIndo(confirmedBooking.booking_date)}{' '}
                    pukul {confirmedBooking.booking_time}.
                  </p>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* 1. Pilih Cabang */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">1. Pilih Cabang</label>
                  <select
                    value={selectedBranch?.id || ''}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                  >
                    {activeBranches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {selectedBranch && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#09090B] dark:text-[#DCA842]" />
                      <span>{selectedBranch.address} · Telp: {selectedBranch.phone}</span>
                    </p>
                  )}
                </div>

                {/* 2. Pilih Barber */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">2. Pilih Barber</label>
                  <select
                    value={effectiveBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                  >
                    {branchBarbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>{barber.name} — {barber.specialty}</option>
                    ))}
                  </select>
                  {(() => {
                    const chosen = branchBarbers.find((b) => b.id === effectiveBarberId);
                    if (!chosen) return null;
                    return (
                      <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60 px-3 py-2">
                        {chosen.photo_url ? (
                          <img src={chosen.photo_url} alt={chosen.name} className="h-8 w-8 rounded-full object-cover border border-[#C5922E]" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#09090B] text-xs font-bold text-white">{chosen.name.slice(0, 1)}</div>
                        )}
                        <div className="min-w-0 text-xs">
                          <p className="font-semibold text-[#09090B] dark:text-white truncate">{chosen.name}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{chosen.specialty}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Pilihan Model Rambut & Seni Garis Bertingkat */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Gaya &amp; Model Rambut Pilihan
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowStyleModal(true)}
                      className="text-[11px] font-bold text-[#C5922E] dark:text-[#DCA842] hover:underline cursor-pointer"
                    >
                      {selectedSpecificStyle ? 'Ganti Gaya' : '+ Pilih Model'}
                    </button>
                  </div>
                  {selectedSpecificStyle ? (
                    <div className="flex items-center justify-between rounded-xl border border-[#DCA842]/40 bg-[#DCA842]/10 p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{selectedSpecificStyle.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            {selectedSpecificStyle.name}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {selectedSpecificStyle.subname} · <span className="text-[#DCA842] font-semibold">{selectedSpecificStyle.tag}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSpecificStyle(null)}
                        className="text-xs text-zinc-400 hover:text-red-400 cursor-pointer p-1"
                        title="Hapus pilihan gaya"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowStyleModal(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:border-[#DCA842] hover:text-[#DCA842] transition-colors cursor-pointer"
                    >
                      <Scissors className="h-4 w-4 text-[#DCA842]" />
                      <span>Pilih Jenis Potongan, Garis Rambut, atau Warna</span>
                    </button>
                  )}
                </div>

                {/* 3. Layanan */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">3. Layanan Terpilih</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                  >
                    {activeServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({formatRupiah(s.price)})</option>
                    ))}
                  </select>
                </div>

                {/* 4-5. Tanggal & Jam */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">4. Tanggal</label>
                    <input
                      type="date"
                      min={getTodayISO()}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">5. Jam Kedatangan</label>
                    <select
                      value={timeSlots.includes(bookingTime) ? bookingTime : timeSlots[0] || ''}
                      onChange={(e) => setBookingTime(e.target.value)}
                      disabled={timeSlots.length === 0}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-900"
                    >
                      {timeSlots.length === 0 ? (
                        <option value="">Cabang Tutup</option>
                      ) : (
                        timeSlots.map((slot) => <option key={slot} value={slot}>{slot} WIT</option>)
                      )}
                    </select>
                  </div>
                </div>

                {selectedDaySchedule && (
                  <div className="rounded-lg bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/70 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#09090B] dark:text-[#DCA842] shrink-0" />
                    <span>
                      Jadwal {selectedDaySchedule.day_name}:{' '}
                      {selectedDaySchedule.is_open
                        ? `${selectedDaySchedule.open_time} – ${selectedDaySchedule.close_time} (${selectedDaySchedule.shift_notes || 'Buka'})`
                        : 'Libur / Tutup'}
                    </span>
                  </div>
                )}

                {/* Nama & WA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Nama Anda</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Bintang"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">No. WhatsApp</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                      required
                    />
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Catatan Model Rambut / Kode Promo</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Mid fade, bagian atas rapikan sedikit"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[#09090B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-[#DCA842]"
                  />
                </div>

                {/* Estimasi biaya */}
                {selectedService && (
                  <div className="flex items-center justify-between rounded-lg bg-[#09090B] px-4 py-3 text-white border border-[#27272A]">
                    <span className="text-xs text-zinc-300">Estimasi Biaya Layanan</span>
                    <span className="font-mono text-base font-bold tabular-nums">{formatRupiah(selectedService.price)}</span>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || timeSlots.length === 0}
                  className="btn-tactile w-full rounded-lg bg-[#09090B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#18181B] shadow-xs dark:bg-[#C5922E] dark:text-zinc-950 dark:hover:bg-[#DCA842] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Mengirim Reservasi...' : 'Konfirmasi Pemesanan Online'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Branches Showcase + Interactive Maps & Route Navigation */}
      <section id="lokasi" className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#09090B] dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#C5922E] dark:text-[#DCA842]" />
              <span>Lokasi &amp; Peta Cabang Barbershop Cenderawasih</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pilih cabang di bawah ini untuk melihat posisi di peta dan otomatis mendapatkan petunjuk rute jalan langsung
            </p>
          </div>
          <a
            href="https://cendrawasihbarber.setmore.com/"
            target="_blank"
            rel="noreferrer"
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold text-[#09090B] dark:text-[#DCA842] hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap self-start sm:self-auto"
          >
            <span>Halaman Setmore Resmi</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Branch Cards Selector */}
        <div className={`grid grid-cols-1 gap-5 ${activeBranches.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {activeBranches.map((branch) => {
            const isSelected = selectedBranch?.id === branch.id;
            const branchStaffCount = barbers.filter((e) => e.branch_id === branch.id).length;
            const branchPhoto =
              branch.photo_url ||
              (branch.id === 'br-samratulangi'
                ? '/assets/setmore/studio-storefront.jpg'
                : '/assets/setmore/gallery-studio.jpg');
            return (
              <div
                key={branch.id}
                onClick={() => setSelectedBranchId(branch.id)}
                className={`group card-tactile rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-[#DCA842] bg-white dark:bg-zinc-900 ring-2 ring-[#DCA842] shadow-lg'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 shadow-sm'
                }`}
              >
                {/* Branch Photo Banner */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                  <img
                    src={branchPhoto}
                    alt={branch.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wider bg-black/70 backdrop-blur-md text-[#DCA842] px-2.5 py-1 rounded-lg border border-[#DCA842]/40 shadow-sm">
                      {branch.code}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-950 bg-[#DCA842] px-2.5 py-1 rounded-full shadow-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-zinc-950" /> Peta Aktif
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Overlay: Branch Name */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-display text-base font-bold text-white drop-shadow-md">
                      {branch.name}
                    </h3>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#DCA842]" />
                    <span>{branch.address}</span>
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <Phone className="h-3.5 w-3.5" /> {branch.phone}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-zinc-700 dark:text-zinc-300">
                      <Clock className="h-3.5 w-3.5 text-[#DCA842]" /> {branch.open_time} – {branch.close_time} WIT
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                      <UserCheck className="h-3.5 w-3.5 text-[#DCA842]" /> {branchStaffCount} Barber Bertugas
                    </span>
                    <span className="text-[11px] font-bold text-[#DCA842] group-hover:underline">
                      Buka Rute &amp; Peta →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Interactive Map + Automatic Route / Direction Controls */}
        {selectedBranch && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-950/50 shadow-sm">
            {/* Header / Info Panel of selected branch */}
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Cabang Dipilih di Peta
                  </span>
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#09090B] dark:text-white truncate">
                  {selectedBranch.name} ({selectedBranch.code})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                  {selectedBranch.address}
                </p>
              </div>

              {/* Action Buttons: Automatic GPS Route + Book Service */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.lat},${selectedBranch.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-tactile inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-colors"
                  title="Buka petunjuk arah GPS di Google Maps"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Petunjuk Jalan / Rute Otomatis</span>
                  <ExternalLink className="h-3 w-3 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={() => setShowBookingModal(true)}
                  className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-[#DCA842] shadow-xs cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Pesan di Cabang Ini</span>
                </button>
              </div>
            </div>

            {/* Embedded Responsive Google Maps */}
            <div className="relative w-full h-[360px] sm:h-[430px] bg-zinc-200 dark:bg-zinc-800">
              <iframe
                title={`Peta Lokasi ${selectedBranch.name}`}
                src={`https://www.google.com/maps?q=${selectedBranch.lat},${selectedBranch.lng}&hl=id&z=17&output=embed`}
                width="100%"
                height="100%"
                style={{border: 0}}
                loading="lazy"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Real Studio Photos & Social Contact Info */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white">
                Galeri Studio Asli Cenderawasih Nabire
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dokumentasi ruangan studio, barber bertugas, dan tampak depan outlet Oyehe
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
              <span>
                WA: <strong className="font-mono text-[#09090B] dark:text-white">0822-3963-7235</strong> /{' '}
                <strong className="font-mono text-[#09090B] dark:text-white">0813-4245-8106</strong>
              </span>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block" />
              <CompactSocialButtons />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                src: '/assets/setmore/studio-interior.jpg',
                title: 'Area Kursi Pangkas Utama',
                caption: 'Cabang Jl. Dr. Sam Ratulangi, Oyehe, Nabire',
              },
              {
                src: '/assets/setmore/studio-riyan.jpg',
                title: 'Layanan Barber Profesional',
                caption: 'Proses pangkas dengan pencahayaan studio modern',
              },
              {
                src: '/assets/setmore/studio-team.jpg',
                title: 'Tim Barber Berpengalaman',
                caption: 'Siap melayani Haircut, Fade, Curly Perm & Coloring',
              },
              {
                src: '/assets/setmore/studio-storefront.jpg',
                title: 'Tampak Depan Barbershop',
                caption: 'Cenderawasih Barbershop · Oyehe, Kabupaten Nabire',
              },
            ].map((item) => (
              <button
                key={item.src}
                type="button"
                onClick={() => setPreviewGallery(item)}
                className="group card-tactile rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden text-left cursor-pointer"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#050507]">
                  <img
                    src={item.src}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-3">
                  <p className="font-display text-xs font-bold text-[#09090B] dark:text-white truncate">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{item.caption}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== MEDIA SOSIAL & GM SECTION ===================== */}
      <section id="media-sosial" className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C5922E]/30 bg-[#C5922E]/10 px-3 py-1 text-xs font-semibold text-[#09090B] dark:text-[#DCA842]">
              <Sparkles className="h-3.5 w-3.5 text-[#C5922E] dark:text-[#DCA842]" />
              <span>TERHUBUNG DENGAN KAMI</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#09090B] dark:text-white">
              Instagram, TikTok, Facebook &amp; Google Maps
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Ikuti kabar tren model rambut terkini, video transformasi pangkas fade &amp; perming, serta rute navigasi Google Maps cabang kami
            </p>
          </div>
        </div>

        {/* 4 Cards Grid for Instagram, TikTok, Facebook, Google Maps */}
        <SocialMediaCardsGrid />
      </section>

      {/* Haircut Example Photo Preview Lightbox Modal */}
      {previewService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between bg-[#09090B] px-5 py-3.5 text-white">
              <div>
                <h3 className="font-display text-sm font-bold">{previewService.name}</h3>
                <p className="text-[11px] text-zinc-300">
                  {previewService.category} · Estimasi {previewService.duration_minutes} menit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewService(null)}
                className="btn-tactile rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Tutup pratinjau contoh potongan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-[4/3] w-full bg-[#050507]">
              {previewService.image_url ? (
                <img
                  src={previewService.image_url}
                  alt={previewService.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/70">
                  <Scissors className="h-10 w-10 text-[#DCA842]" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Tarif Resmi</p>
                <p className="font-mono text-xl font-bold text-[#09090B] dark:text-[#DCA842] tabular-nums">
                  {formatRupiah(previewService.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedServiceId(previewService.id);
                  setPreviewService(null);
                  const el = document.getElementById('formulir-reservasi');
                  if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
                }}
                className="btn-tactile rounded-lg bg-[#09090B] dark:bg-[#C5922E] px-4 py-2.5 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-[#18181B] dark:hover:bg-[#DCA842] cursor-pointer"
              >
                Pilih Layanan Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Studio Photo Lightbox Modal */}
      {previewGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between bg-[#09090B] px-5 py-3.5 text-white">
              <div>
                <h3 className="font-display text-sm font-bold">{previewGallery.title}</h3>
                <p className="text-[11px] text-zinc-300">{previewGallery.caption}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewGallery(null)}
                className="btn-tactile rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Tutup galeri studio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-[4/3] w-full bg-[#050507]">
              <img src={previewGallery.src} alt={previewGallery.title} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      )}

      {/* Official Price List Poster Modal */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between bg-[#09090B] px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-[#DCA842]" />
                <span className="font-display text-sm font-bold">Daftar Harga Resmi Barbershop Cendrawasih</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="btn-tactile rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Tutup poster"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto bg-zinc-950 p-3 flex justify-center">
              <img
                src="/assets/aistudio/IMG-20261117-WA0023_070132b0.jpg"
                alt="Poster Daftar Harga Resmi Barbershop Cendrawasih"
                referrerPolicy="no-referrer"
                className="w-full h-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL KATALOG MODEL & SENI GARIS RAMBUT BERTINGKAT */}
      {showStyleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-[#09090B] text-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCA842]/15 text-[#DCA842]">
                  <Scissors className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Katalog Model Rambut &amp; Seni Garis</h3>
                  <p className="text-xs text-zinc-400">Pilih model rambut, aksen garis (hair tattoo), warna, atau perming</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStyleModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex border-b border-zinc-800 px-6 py-2.5 gap-2 overflow-x-auto bg-zinc-900/60 shrink-0">
              {(['HAIRCUT', 'HAIR COLOR', 'HAIR PERMING', 'STYLING'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    catalogCategoryFilter === cat
                      ? 'bg-[#DCA842] text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {cat === 'HAIRCUT' ? '✂️ Potongan & Seni Garis' :
                   cat === 'HAIR COLOR' ? '🎨 Pewarnaan Rambut' :
                   cat === 'HAIR PERMING' ? '🌀 Hair Perming' : '✨ Styling & Treatment'}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPECIFIC_STYLES.filter((s) => s.category === catalogCategoryFilter).map((style) => {
                const isChosen = selectedSpecificStyle?.id === style.id;
                return (
                  <div
                    key={style.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                      isChosen
                        ? 'border-[#DCA842] bg-[#DCA842]/10 ring-1 ring-[#DCA842]'
                        : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{style.icon}</span>
                          <span className="text-sm font-bold text-white">{style.name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-[#DCA842] border border-zinc-700">
                          {style.tag}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-300">{style.subname}</p>
                      <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">{style.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Tersedia di semua cabang</span>
                      <button
                        type="button"
                        onClick={() => handleApplySpecificStyle(style)}
                        className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isChosen
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#DCA842] text-zinc-950 hover:bg-[#C5922E]'
                        }`}
                      >
                        {isChosen ? '✓ Terpilih' : 'Pilih Model Ini'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 px-6 py-3 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
              <span>Model pilihan Anda akan otomatis diteruskan ke barber saat jadwal tiba.</span>
              <button
                type="button"
                onClick={() => setShowStyleModal(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

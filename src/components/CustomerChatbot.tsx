import {Bot, MessageCircle, Send, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import type {Branch, ServiceItem} from '../types.ts';
import {formatRupiah} from '../utils/format.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface CustomerChatbotProps {
  branches?: Branch[];
  services?: ServiceItem[];
}

// FAQ Responses berbasis kata kunci
const getFaqResponse = (input: string, branches: Branch[], services: ServiceItem[]): string => {
  const q = input.toLowerCase().trim();

  // Jam buka / operasional
  if (q.match(/jam|buka|tutup|operasi|senin|selasa|sabtu|hari|waktu|jadwal/)) {
    return '🕐 Cendrawasih Barbershop buka setiap *Senin–Sabtu pukul 10.00–22.00 WIT*. Khusus hari Minggu libur. Cabang kami:\n• CW-01 Jl. Sam Ratulangi (Pusat)\n• CW-02 Jl. Yos Sudarso, Oyehe\n\nSilakan booking terlebih dahulu agar antrian Anda terdaftar! 📅';
  }

  // Lokasi / alamat
  if (q.match(/lokasi|alamat|mana|jl|jalan|sam ratu|yos sud|nabire|oyehe|cabang|branch/)) {
    const branchList = branches.length > 0
      ? branches.filter(b => b.is_active === 1).map(b => `• ${b.name}: ${b.address}`).join('\n')
      : '• CW-01: Jl. Dr. Sam Ratulangi, Nabire\n• CW-02: Jl. Yos Sudarso, Oyehe, Nabire';
    return `📍 Lokasi Cendrawasih Barbershop:\n${branchList}\n\nGunakan Google Maps dan cari "Barbershop Cenderawasih Nabire" untuk petunjuk arah! 🗺️`;
  }

  // Harga / tarif / biaya
  if (q.match(/harga|tarif|biaya|bayar|mahal|murah|berapa|cost|price/)) {
    const activeServices = services.filter(s => s.is_active === 1).slice(0, 6);
    const serviceList = activeServices.length > 0
      ? activeServices.map(s => `• ${s.name}: ${formatRupiah(s.price)}`).join('\n')
      : '• Haircut (Regular): Rp 70.000\n• Haircut (Premium): Rp 85.000–150.000\n• Hair Coloring: mulai Rp 350.000\n• Hair Perming: mulai Rp 350.000\n• Styling: Rp 40.000–50.000';
    return `💈 Daftar Harga Layanan Cendrawasih:\n${serviceList}\n\nUntuk info harga lengkap, silakan scroll ke bagian *Layanan & Harga* di halaman ini! 👆`;
  }

  // Booking / reservasi / janji
  if (q.match(/booking|reservasi|janji|temu|daftar|antri|queue|pesan/)) {
    return '📋 Cara booking di Cendrawasih Barbershop:\n1. Scroll ke bawah dan klik tombol *"Booking Sekarang"*\n2. Pilih cabang, barber pilihan, dan layanan\n3. Pilih tanggal & jam yang tersedia\n4. Isi nama dan nomor WhatsApp Anda\n5. Klik *Konfirmasi Booking*\n\nBooking gratis dan tidak dipungut biaya pendaftaran! ✅';
  }

  // Barber / kapster / staff
  if (q.match(/barber|kapster|tukang|pangkas|karyawan|staff|siapa|who/)) {
    return '✂️ Tim barber profesional kami terdiri dari kapster berpengalaman yang terlatih dalam:\n• Teknik Haircut modern & klasik\n• Hair Coloring & Bleaching\n• Hair Perming\n• Styling & Grooming\n\nSemua barber kami menggunakan produk premium dan berlisensi! 💪 Anda bisa memilih barber favorit saat booking.';
  }

  // Produk / pomade
  if (q.match(/produk|pomade|hairtonic|powder|jual|beli|produck/)) {
    return '🛍️ Kami juga menjual produk grooming berkualitas:\n• Pomade premium\n• Hair Tonic\n• Hair Powder / Clay\n\nTersedia di kedua cabang kami. Tanya langsung ke kasir untuk info ketersediaan stok! 😊';
  }

  // Pembayaran / metode bayar / QRIS / transfer
  if (q.match(/bayar|payment|transfer|qris|cash|tunai|mandiri|metode/)) {
    return '💳 Metode pembayaran yang diterima:\n• *Uang Tunai (Cash)*\n• *QRIS* (semua bank & e-wallet)\n• *Transfer Bank* (Mandiri)\n• *QI Mandiri*\n\nSemua pembayaran dicatat secara digital dan Anda mendapat nota resmi! 🧾';
  }

  // WhatsApp / kontak / hubungi / telepon
  if (q.match(/whatsapp|wa|kontak|hubungi|telpon|telepon|hp|no|nomor|phone|contact/)) {
    return '📱 Hubungi kami:\n• WhatsApp/Telepon: Silakan cek bagian *Kontak* di bawah halaman ini\n• Instagram: @cendrawasih.barbershop\n• Jam respon: Senin–Sabtu, 10.00–21.00 WIT\n\nUntuk pertanyaan mendesak, kunjungi langsung ke cabang terdekat! 🏪';
  }

  // Promo / diskon / voucher
  if (q.match(/promo|diskon|voucher|potongan|gratis|bonus|special|hemat/)) {
    return '🎉 Promo & diskon terbaru tersedia di bagian *"Promo & Berita"* halaman ini!\n\nIkuti juga Instagram kami untuk update promo terkini. Promo berlaku untuk waktu terbatas, jadi jangan sampai ketinggalan! 🔥';
  }

  // Salam / halo
  if (q.match(/halo|hei|hi|hello|hai|selamat|good|pagi|siang|sore|malam|assalam/)) {
    return '👋 Halo! Selamat datang di *Cendrawasih Barbershop* Nabire!\n\nSaya asisten virtual Cendrawasih. Saya bisa membantu menjawab pertanyaan seputar:\n• Jam operasional & lokasi\n• Daftar layanan & harga\n• Cara booking\n• Metode pembayaran\n• Promo terkini\n\nAda yang bisa saya bantu? 😊';
  }

  // Terima kasih
  if (q.match(/terima kasih|thanks|thank|makasih|terimakasih/)) {
    return '😊 Sama-sama! Senang bisa membantu. Jangan ragu untuk menghubungi kami kembali jika ada pertanyaan lain.\n\nSampai jumpa di Cendrawasih Barbershop! ✂️💈';
  }

  // Default / tidak dikenali
  return `🤔 Maaf, saya kurang mengerti pertanyaan Anda. Coba tanyakan tentang:\n• *"jam buka"* — info operasional\n• *"lokasi"* — alamat cabang\n• *"harga"* — tarif layanan\n• *"booking"* — cara reservasi\n• *"promo"* — info diskon\n• *"bayar"* — metode pembayaran\n\nAtau hubungi kami langsung via WhatsApp! 📱`;
};

export const CustomerChatbot: React.FC<CustomerChatbotProps> = ({branches = [], services = []}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: '👋 Halo! Selamat datang di *Cendrawasih Barbershop*!\n\nSaya asisten virtual siap membantu Anda. Tanyakan apa saja tentang layanan, harga, booking, atau info cabang kami! 💈',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate bot typing delay
    window.setTimeout(() => {
      const botReply = getFaqResponse(text, branches, services);
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'bot',
        text: botReply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700 + Math.random() * 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatText = (text: string) => {
    // Bold *text* → <strong>
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*[^*]+\*)/).map((part, j) =>
          part.startsWith('*') && part.endsWith('*') ? (
            <strong key={j}>{part.slice(1, -1)}</strong>
          ) : (
            part
          )
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const QUICK_REPLIES = ['Jam buka?', 'Lokasi cabang?', 'Daftar harga?', 'Cara booking?'];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Buka chatbot"
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
          isOpen
            ? 'bg-zinc-800 text-white scale-95'
            : 'bg-[#DCA842] text-zinc-950 hover:scale-110 hover:shadow-[#DCA842]/40'
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
        {!isOpen && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {Math.min(messages.length - 1, 9)}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[75vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#09090B] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#09090B] dark:bg-zinc-900 border-b border-zinc-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCA842] text-zinc-950 shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Asisten Cendrawasih</p>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-zinc-400">Online · Siap membantu</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 bg-zinc-50 dark:bg-zinc-950">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'bot' && (
                  <div className="h-7 w-7 rounded-full bg-[#DCA842] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-zinc-950" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#09090B] dark:bg-[#DCA842] text-white dark:text-zinc-950 rounded-tr-sm'
                      : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-tl-sm'
                  }`}
                >
                  {formatText(msg.text)}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-[#DCA842] flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-zinc-950" />
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{animationDelay: '0ms'}} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{animationDelay: '150ms'}} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 2 && !isTyping && (
            <div className="px-3 py-2 flex gap-1.5 flex-wrap border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => {
                    setInput(qr);
                    setTimeout(() => sendMessage(), 10);
                    setInput(qr);
                  }}
                  className="rounded-full border border-[#DCA842]/50 bg-[#DCA842]/10 px-3 py-1 text-[11px] font-semibold text-[#C5922E] dark:text-[#DCA842] hover:bg-[#DCA842]/20 cursor-pointer transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan Anda..."
              className="flex-1 min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-[#DCA842] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DCA842] text-zinc-950 hover:bg-[#C5922E] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};


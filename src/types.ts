export type Adegan = {
  /** hook = pembuka, langkah = satu tahap, fakta = angka/fakta besar, penutup = ajakan follow */
  tipe: 'hook' | 'langkah' | 'fakta' | 'penutup';
  emoji: string;
  /** judul pendek di layar */
  judul: string;
  /** kalimat yang diucapkan (juga jadi teks karaoke) */
  narasi: string;
  /** angka besar (hanya digit dan titik ribuan = dihitung naik). Contoh "500.000" */
  angka?: string;
  satuan?: string;
  /** deretan emoji yang menyala berurutan sesuai narasi */
  alur?: string[];
  /** perumpamaan sehari-hari, maks ± 85 huruf */
  analogi?: string;
  /** diisi otomatis oleh scripts/build.mjs */
  audio?: string | null;
};

export type Episode = {
  id?: string;
  judul: string;
  channel: string;
  /** suara edge-tts: id-ID-ArdiNeural (pria) atau id-ID-GadisNeural (wanita) */
  suara?: string;
  kecepatan?: string;
  /** warna utama, format #RRGGBB */
  warna: string;
  adegan: Adegan[];
};

export type Props = {
  episode: Episode;
  durasi?: number[];
};

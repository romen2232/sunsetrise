export type Lang = 'en' | 'es';

export const I18N: Record<Lang, {
  header: { desc: string; time: string; dur: string };
  segments: {
    astro: string; nautical: string; civil: string;
    sunrise: string; golden: string; noon: string; sunset: string;
  };
  titles: { sunrise: string; sunset: string };
}> = {
  en: {
    header: { desc: 'Description', time: 'HH:MM', dur: 'Duration' },
    segments: {
      astro: 'Astronomical twilight',
      nautical: 'Nautical twilight',
      civil: 'Civil twilight',
      sunrise: 'Sunrise',
      golden: 'Golden hour',
      noon: 'Solar noon',
      sunset: 'Sunset',
    },
    titles: { sunrise: 'Sunrise', sunset: 'Sunset' },
  },
  es: {
    header: { desc: 'Descripción', time: 'HH:MM', dur: 'Duración' },
    segments: {
      astro: 'Crepúsculo astronómico',
      nautical: 'Crepúsculo náutico',
      civil: 'Crepúsculo civil',
      sunrise: 'Amanecer',
      golden: 'La hora dorada',
      noon: 'Cenit',
      sunset: 'Atardecer',
    },
    titles: { sunrise: 'Amanecer', sunset: 'Atardecer' },
  },
};



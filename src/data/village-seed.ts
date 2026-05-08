import type { LocalizedText } from '@/types';

export type VillageSeed = {
  /** Unique within its region. Disambiguated where needed (e.g. laza-gabala). */
  slug: string;
  regionSlug: string;
  name: LocalizedText;
  sortOrder: number;
};

/**
 * Initial village catalogue keyed by parent region slug. Admin can extend.
 * Slugs are disambiguated across regions where the same name occurs (Laza
 * exists in both Gabala and Gusar) so URL filters stay flat.
 */
export const VILLAGE_SEED: readonly VillageSeed[] = [
  // gabala
  {
    regionSlug: 'gabala',
    slug: 'vandam',
    name: { az: 'Vəndam', ru: 'Вандам', en: 'Vandam' },
    sortOrder: 10,
  },
  { regionSlug: 'gabala', slug: 'nij', name: { az: 'Nic', ru: 'Нидж', en: 'Nij' }, sortOrder: 20 },
  {
    regionSlug: 'gabala',
    slug: 'laza-gabala',
    name: { az: 'Laza (Qəbələ)', ru: 'Лаза (Габала)', en: 'Laza (Gabala)' },
    sortOrder: 30,
  },
  {
    regionSlug: 'gabala',
    slug: 'nohur-gabala',
    name: { az: 'Nohur', ru: 'Нохур', en: 'Nohur' },
    sortOrder: 40,
  },
  {
    regionSlug: 'gabala',
    slug: 'hamzalli',
    name: { az: 'Həmzəlli', ru: 'Гамзалли', en: 'Hamzalli' },
    sortOrder: 50,
  },
  {
    regionSlug: 'gabala',
    slug: 'yengice',
    name: { az: 'Yengicə', ru: 'Енгидже', en: 'Yengice' },
    sortOrder: 60,
  },
  {
    regionSlug: 'gabala',
    slug: 'bayramkand',
    name: { az: 'Bayramkənd', ru: 'Байрамкенд', en: 'Bayramkand' },
    sortOrder: 70,
  },
  {
    regionSlug: 'gabala',
    slug: 'qamarvan',
    name: { az: 'Qəmərvan', ru: 'Гамарван', en: 'Gamarvan' },
    sortOrder: 80,
  },
  {
    regionSlug: 'gabala',
    slug: 'mikhliqovag',
    name: { az: 'Mıxlıqovaq', ru: 'Михликовак', en: 'Mikhlikovag' },
    sortOrder: 90,
  },
  {
    regionSlug: 'gabala',
    slug: 'tufanli',
    name: { az: 'Tufanlı', ru: 'Туфанлы', en: 'Tufanli' },
    sortOrder: 100,
  },

  // sheki
  { regionSlug: 'sheki', slug: 'kish', name: { az: 'Kiş', ru: 'Киш', en: 'Kish' }, sortOrder: 10 },
  {
    regionSlug: 'sheki',
    slug: 'bash-goynuk',
    name: { az: 'Baş Göynük', ru: 'Баш-Гёйнюк', en: 'Bash Goynuk' },
    sortOrder: 20,
  },
  {
    regionSlug: 'sheki',
    slug: 'bash-shabalid',
    name: { az: 'Baş Şabalıd', ru: 'Баш-Шабалыд', en: 'Bash Shabalid' },
    sortOrder: 30,
  },
  {
    regionSlug: 'sheki',
    slug: 'cumakand',
    name: { az: 'Cumakənd', ru: 'Джумакенд', en: 'Jumakand' },
    sortOrder: 40,
  },
  {
    regionSlug: 'sheki',
    slug: 'qaynar',
    name: { az: 'Qaynar', ru: 'Гайнар', en: 'Gaynar' },
    sortOrder: 50,
  },

  // gakh
  {
    regionSlug: 'gakh',
    slug: 'ilisu',
    name: { az: 'İlisu', ru: 'Илису', en: 'Ilisu' },
    sortOrder: 10,
  },
  {
    regionSlug: 'gakh',
    slug: 'saribash',
    name: { az: 'Sarıbaş', ru: 'Сарыбаш', en: 'Saribash' },
    sortOrder: 20,
  },
  { regionSlug: 'gakh', slug: 'qum', name: { az: 'Qum', ru: 'Гум', en: 'Gum' }, sortOrder: 30 },
  {
    regionSlug: 'gakh',
    slug: 'lakit',
    name: { az: 'Ləkit', ru: 'Лекит', en: 'Lakit' },
    sortOrder: 40,
  },

  // zagatala
  {
    regionSlug: 'zagatala',
    slug: 'mamrux',
    name: { az: 'Mamrux', ru: 'Мамрух', en: 'Mamrukh' },
    sortOrder: 10,
  },
  {
    regionSlug: 'zagatala',
    slug: 'car',
    name: { az: 'Car', ru: 'Джар', en: 'Jar' },
    sortOrder: 20,
  },
  {
    regionSlug: 'zagatala',
    slug: 'ashagi-tala',
    name: { az: 'Aşağı Tala', ru: 'Ашагы-Тала', en: 'Ashagi Tala' },
    sortOrder: 30,
  },
  {
    regionSlug: 'zagatala',
    slug: 'qimir',
    name: { az: 'Qımır', ru: 'Гимыр', en: 'Gimir' },
    sortOrder: 40,
  },

  // guba
  {
    regionSlug: 'guba',
    slug: 'khinalug',
    name: { az: 'Xınalıq', ru: 'Хыналыг', en: 'Khinalug' },
    sortOrder: 10,
  },
  {
    regionSlug: 'guba',
    slug: 'qriz',
    name: { az: 'Qrız', ru: 'Гырыз', en: 'Griz' },
    sortOrder: 20,
  },
  {
    regionSlug: 'guba',
    slug: 'qirmizi-qasaba',
    name: { az: 'Qırmızı Qəsəbə', ru: 'Красная Слобода', en: 'Qirmizi Qasaba' },
    sortOrder: 30,
  },
  {
    regionSlug: 'guba',
    slug: 'tangaalti',
    name: { az: 'Təngəaltı', ru: 'Тангеалты', en: 'Tangaalti' },
    sortOrder: 40,
  },
  {
    regionSlug: 'guba',
    slug: 'afurca',
    name: { az: 'Əfurca', ru: 'Афурджа', en: 'Afurja' },
    sortOrder: 50,
  },
  { regionSlug: 'guba', slug: 'alic', name: { az: 'Alıc', ru: 'Алыч', en: 'Alij' }, sortOrder: 60 },

  // gusar
  {
    regionSlug: 'gusar',
    slug: 'laza-gusar',
    name: { az: 'Laza (Qusar)', ru: 'Лаза (Гусар)', en: 'Laza (Gusar)' },
    sortOrder: 10,
  },
  {
    regionSlug: 'gusar',
    slug: 'anig',
    name: { az: 'Anıq', ru: 'Аныг', en: 'Anig' },
    sortOrder: 20,
  },
  { regionSlug: 'gusar', slug: 'hil', name: { az: 'Hil', ru: 'Хиль', en: 'Hil' }, sortOrder: 30 },
  {
    regionSlug: 'gusar',
    slug: 'suvacal',
    name: { az: 'Suvacal', ru: 'Сувачал', en: 'Suvajal' },
    sortOrder: 40,
  },

  // khachmaz
  {
    regionSlug: 'khachmaz',
    slug: 'nabran',
    name: { az: 'Nabran', ru: 'Набрань', en: 'Nabran' },
    sortOrder: 10,
  },
  {
    regionSlug: 'khachmaz',
    slug: 'yalama',
    name: { az: 'Yalama', ru: 'Ялама', en: 'Yalama' },
    sortOrder: 20,
  },

  // shabran
  {
    regionSlug: 'shabran',
    slug: 'galaalti',
    name: { az: 'Qalaaltı', ru: 'Галаалты', en: 'Galaalti' },
    sortOrder: 10,
  },
  {
    regionSlug: 'shabran',
    slug: 'gilezi',
    name: { az: 'Gilezi', ru: 'Гилези', en: 'Gilezi' },
    sortOrder: 20,
  },

  // ismayilli
  {
    regionSlug: 'ismayilli',
    slug: 'lahij',
    name: { az: 'Lahıc', ru: 'Лагич', en: 'Lahij' },
    sortOrder: 10,
  },
  {
    regionSlug: 'ismayilli',
    slug: 'basqal',
    name: { az: 'Basqal', ru: 'Баскал', en: 'Basqal' },
    sortOrder: 20,
  },
  {
    regionSlug: 'ismayilli',
    slug: 'ivanovka',
    name: { az: 'İvanovka', ru: 'Ивановка', en: 'Ivanovka' },
    sortOrder: 30,
  },
  {
    regionSlug: 'ismayilli',
    slug: 'diyalli',
    name: { az: 'Diyallı', ru: 'Диаллы', en: 'Diyalli' },
    sortOrder: 40,
  },
  {
    regionSlug: 'ismayilli',
    slug: 'talistan',
    name: { az: 'Talıstan', ru: 'Талыстан', en: 'Talistan' },
    sortOrder: 50,
  },

  // shamakhi
  {
    regionSlug: 'shamakhi',
    slug: 'chukhuryurd',
    name: { az: 'Çuxuryurd', ru: 'Чухурюрд', en: 'Chukhuryurd' },
    sortOrder: 10,
  },
  {
    regionSlug: 'shamakhi',
    slug: 'madrasa',
    name: { az: 'Mədrəsə', ru: 'Медресе', en: 'Madrasa' },
    sortOrder: 20,
  },
  {
    regionSlug: 'shamakhi',
    slug: 'pirgulu',
    name: { az: 'Pirqulu', ru: 'Пиргулу', en: 'Pirgulu' },
    sortOrder: 30,
  },
  {
    regionSlug: 'shamakhi',
    slug: 'demirchi',
    name: { az: 'Dəmirçi', ru: 'Демирчи', en: 'Demirchi' },
    sortOrder: 40,
  },

  // goychay
  {
    regionSlug: 'goychay',
    slug: 'bigir',
    name: { az: 'Bığır', ru: 'Быгыр', en: 'Bigir' },
    sortOrder: 10,
  },
  {
    regionSlug: 'goychay',
    slug: 'charaka',
    name: { az: 'Çərəkə', ru: 'Чаракя', en: 'Charaka' },
    sortOrder: 20,
  },

  // lankaran
  {
    regionSlug: 'lankaran',
    slug: 'hirkan',
    name: { az: 'Hirkan', ru: 'Хиркан', en: 'Hirkan' },
    sortOrder: 10,
  },
  {
    regionSlug: 'lankaran',
    slug: 'diga',
    name: { az: 'Diqa', ru: 'Дига', en: 'Diga' },
    sortOrder: 20,
  },
  {
    regionSlug: 'lankaran',
    slug: 'liman',
    name: { az: 'Liman', ru: 'Лиман', en: 'Liman' },
    sortOrder: 30,
  },
  {
    regionSlug: 'lankaran',
    slug: 'varavul',
    name: { az: 'Varavul', ru: 'Варавул', en: 'Varavul' },
    sortOrder: 40,
  },

  // astara
  {
    regionSlug: 'astara',
    slug: 'penser',
    name: { az: 'Pensər', ru: 'Пенсер', en: 'Penser' },
    sortOrder: 10,
  },
  {
    regionSlug: 'astara',
    slug: 'shahagac',
    name: { az: 'Şahağac', ru: 'Шахагадж', en: 'Shahagaj' },
    sortOrder: 20,
  },

  // lerik
  {
    regionSlug: 'lerik',
    slug: 'hamarat',
    name: { az: 'Hamarat', ru: 'Гамарат', en: 'Hamarat' },
    sortOrder: 10,
  },
  {
    regionSlug: 'lerik',
    slug: 'kalakhan',
    name: { az: 'Kələxan', ru: 'Келехан', en: 'Kalakhan' },
    sortOrder: 20,
  },
  {
    regionSlug: 'lerik',
    slug: 'cangamiran',
    name: { az: 'Cəngəmiran', ru: 'Джангамиран', en: 'Jangamiran' },
    sortOrder: 30,
  },

  // masally
  {
    regionSlug: 'masally',
    slug: 'istisu',
    name: { az: 'İstisu', ru: 'Истису', en: 'Istisu' },
    sortOrder: 10,
  },
  {
    regionSlug: 'masally',
    slug: 'arkivan',
    name: { az: 'Ərkivan', ru: 'Аркиван', en: 'Arkivan' },
    sortOrder: 20,
  },

  // naftalan
  {
    regionSlug: 'naftalan',
    slug: 'naftalan-town',
    name: { az: 'Naftalan şəhəri', ru: 'Город Нафталан', en: 'Naftalan Town' },
    sortOrder: 10,
  },

  // absheron
  {
    regionSlug: 'absheron',
    slug: 'mardakan',
    name: { az: 'Mərdəkan', ru: 'Мардакян', en: 'Mardakan' },
    sortOrder: 10,
  },
  {
    regionSlug: 'absheron',
    slug: 'shuvelan',
    name: { az: 'Şüvəlan', ru: 'Шувелан', en: 'Shuvelan' },
    sortOrder: 20,
  },
  {
    regionSlug: 'absheron',
    slug: 'buzovna',
    name: { az: 'Buzovna', ru: 'Бузовна', en: 'Buzovna' },
    sortOrder: 30,
  },
  {
    regionSlug: 'absheron',
    slug: 'pirshaghi',
    name: { az: 'Pirşağı', ru: 'Пиршаги', en: 'Pirshaghi' },
    sortOrder: 40,
  },
  {
    regionSlug: 'absheron',
    slug: 'bilgah',
    name: { az: 'Bilgəh', ru: 'Бильгя', en: 'Bilgah' },
    sortOrder: 50,
  },
  {
    regionSlug: 'absheron',
    slug: 'novkhani',
    name: { az: 'Novxanı', ru: 'Новханы', en: 'Novkhani' },
    sortOrder: 60,
  },
  {
    regionSlug: 'absheron',
    slug: 'qala',
    name: { az: 'Qala', ru: 'Гала', en: 'Gala' },
    sortOrder: 70,
  },
];

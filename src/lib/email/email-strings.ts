/**
 * Email copy, kept deliberately SEPARATE from the next-intl app messages in
 * `src/i18n/messages/*.json`.
 *
 * Those are shipped to the browser and keyed for UI components; these are
 * server-only, rendered into HTML by React Email, and versioned with the
 * templates that consume them. Merging the two would either bloat the client
 * bundle with copy no page renders or couple email wording to UI refactors.
 *
 * The locale used is always the *recipient's* `User.preferredLocale`, never
 * the locale of the request that triggered the send.
 */

export const EMAIL_LOCALES = ['az', 'ru', 'en'] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];

export const isEmailLocale = (value: string | null | undefined): value is EmailLocale =>
  !!value && (EMAIL_LOCALES as readonly string[]).includes(value);

/** Falls back to Azerbaijani — the primary market, and the app's default locale. */
export const toEmailLocale = (value: string | null | undefined): EmailLocale =>
  isEmailLocale(value) ? value : 'az';

type Strings = {
  /** Shared chrome. */
  common: {
    greeting: string;
    signOff: string;
    footerNote: string;
  };
  listingApproved: {
    subject: (title: string) => string;
    heading: string;
    body: string;
    cta: string;
  };
  listingRejected: {
    subject: (title: string) => string;
    heading: string;
    body: string;
    reasonLabel: string;
    cta: string;
  };
  messageNew: {
    subject: (title: string) => string;
    heading: string;
    body: string;
    cta: string;
  };
};

const az: Strings = {
  common: {
    greeting: 'Salam',
    signOff: 'irayon komandası',
    footerNote: 'Bu məktub irayon hesabınızdakı fəaliyyətə görə göndərilib.',
  },
  listingApproved: {
    subject: (title) => `"${title}" elanınız təsdiqləndi`,
    heading: 'Elanınız yayımdadır',
    body: 'Elanınız yoxlanışdan keçdi və artıq saytda görünür.',
    cta: 'Elana bax',
  },
  messageNew: {
    subject: (title) => `Yeni mesaj: ${title}`,
    heading: 'Yeni mesajınız var',
    body: 'Rezervasiya ilə bağlı sizə yeni mesaj gəlib.',
    cta: 'Mesajı oxu',
  },
  listingRejected: {
    subject: (title) => `"${title}" elanınız təsdiqlənmədi`,
    heading: 'Elanınıza düzəliş lazımdır',
    body: 'Elanınızı nəzərdən keçirdik və hazırda yayımlaya bilmirik.',
    reasonLabel: 'Səbəb',
    cta: 'Elanı redaktə et',
  },
};

const ru: Strings = {
  common: {
    greeting: 'Здравствуйте',
    signOff: 'Команда irayon',
    footerNote: 'Это письмо отправлено в связи с активностью в вашем аккаунте irayon.',
  },
  listingApproved: {
    subject: (title) => `Объявление «${title}» одобрено`,
    heading: 'Ваше объявление опубликовано',
    body: 'Объявление прошло проверку и теперь видно на сайте.',
    cta: 'Открыть объявление',
  },
  messageNew: {
    subject: (title) => `Новое сообщение: ${title}`,
    heading: 'У вас новое сообщение',
    body: 'Вам написали по поводу бронирования.',
    cta: 'Прочитать',
  },
  listingRejected: {
    subject: (title) => `Объявление «${title}» отклонено`,
    heading: 'Объявление нужно доработать',
    body: 'Мы проверили объявление и пока не можем его опубликовать.',
    reasonLabel: 'Причина',
    cta: 'Редактировать объявление',
  },
};

const en: Strings = {
  common: {
    greeting: 'Hi',
    signOff: 'The irayon team',
    footerNote: 'You received this email because of activity on your irayon account.',
  },
  listingApproved: {
    subject: (title) => `Your listing "${title}" was approved`,
    heading: 'Your listing is live',
    body: 'Your listing passed review and is now visible on the site.',
    cta: 'View listing',
  },
  messageNew: {
    subject: (title) => `New message: ${title}`,
    heading: 'You have a new message',
    body: 'Someone messaged you about a booking.',
    cta: 'Read it',
  },
  listingRejected: {
    subject: (title) => `Your listing "${title}" was not approved`,
    heading: 'Your listing needs changes',
    body: "We reviewed your listing and can't publish it as it stands.",
    reasonLabel: 'Reason',
    cta: 'Edit listing',
  },
};

const STRINGS: Record<EmailLocale, Strings> = { az, ru, en };

export const emailStrings = (locale: EmailLocale): Strings => STRINGS[locale];

/**
 * Booking emails.
 *
 * Kept in a separate table from the listing-moderation copy above because they
 * share a single template component parameterised by `kind` — five near-identical
 * template files would drift in layout the first time one of them was tweaked.
 */
export type BookingEmailKind = 'requested' | 'accepted' | 'declined' | 'expired' | 'cancelled';

type BookingStrings = {
  subject: (title: string) => string;
  heading: string;
  body: string;
  cta: string;
};

const bookingAz: Record<BookingEmailKind, BookingStrings> = {
  requested: {
    subject: (t) => `Yeni rezervasiya sorğusu: ${t}`,
    heading: 'Yeni sorğu',
    body: 'Elanınız üçün yeni rezervasiya sorğusu var. Cavab müddəti bitməmiş baxın.',
    cta: 'Sorğuya bax',
  },
  accepted: {
    subject: (t) => `Rezervasiyanız təsdiqləndi: ${t}`,
    heading: 'Rezervasiya təsdiqləndi',
    body: 'Ev sahibi sorğunuzu qəbul etdi. Ödəniş və digər detallar üçün onunla əlaqə saxlayın.',
    cta: 'Rezervasiyaya bax',
  },
  declined: {
    subject: (t) => `Rezervasiya sorğunuz rədd edildi: ${t}`,
    heading: 'Sorğu rədd edildi',
    body: 'Təəssüf ki, ev sahibi bu tarixlər üçün sorğunuzu qəbul etmədi.',
    cta: 'Başqa yer tap',
  },
  expired: {
    subject: (t) => `Rezervasiya sorğunuzun müddəti bitdi: ${t}`,
    heading: 'Sorğunun müddəti bitdi',
    body: 'Ev sahibi vaxtında cavab vermədi. Başqa tarixlər və ya başqa yer sınaya bilərsiniz.',
    cta: 'Yenidən cəhd et',
  },
  cancelled: {
    subject: (t) => `Rezervasiya ləğv edildi: ${t}`,
    heading: 'Rezervasiya ləğv edildi',
    body: 'Bu rezervasiya ləğv edildi.',
    cta: 'Rezervasiyalarıma bax',
  },
};

const bookingRu: Record<BookingEmailKind, BookingStrings> = {
  requested: {
    subject: (t) => `Новый запрос на бронирование: ${t}`,
    heading: 'Новый запрос',
    body: 'По вашему объявлению поступил новый запрос. Ответьте до истечения срока.',
    cta: 'Открыть запрос',
  },
  accepted: {
    subject: (t) => `Бронирование подтверждено: ${t}`,
    heading: 'Бронирование подтверждено',
    body: 'Хозяин принял ваш запрос. Свяжитесь с ним об оплате и деталях заезда.',
    cta: 'Открыть бронирование',
  },
  declined: {
    subject: (t) => `Запрос отклонён: ${t}`,
    heading: 'Запрос отклонён',
    body: 'К сожалению, хозяин не принял запрос на эти даты.',
    cta: 'Найти другое жильё',
  },
  expired: {
    subject: (t) => `Срок запроса истёк: ${t}`,
    heading: 'Срок запроса истёк',
    body: 'Хозяин не ответил вовремя. Попробуйте другие даты или другое жильё.',
    cta: 'Попробовать снова',
  },
  cancelled: {
    subject: (t) => `Бронирование отменено: ${t}`,
    heading: 'Бронирование отменено',
    body: 'Это бронирование было отменено.',
    cta: 'Мои бронирования',
  },
};

const bookingEn: Record<BookingEmailKind, BookingStrings> = {
  requested: {
    subject: (t) => `New booking request: ${t}`,
    heading: 'New request',
    body: 'You have a new booking request. Respond before the window closes.',
    cta: 'View request',
  },
  accepted: {
    subject: (t) => `Your booking is confirmed: ${t}`,
    heading: 'Booking confirmed',
    body: 'The host accepted your request. Contact them to arrange payment and arrival.',
    cta: 'View booking',
  },
  declined: {
    subject: (t) => `Your booking request was declined: ${t}`,
    heading: 'Request declined',
    body: "Unfortunately the host couldn't take your request for these dates.",
    cta: 'Find another place',
  },
  expired: {
    subject: (t) => `Your booking request expired: ${t}`,
    heading: 'Request expired',
    body: "The host didn't respond in time. Try different dates, or another place.",
    cta: 'Try again',
  },
  cancelled: {
    subject: (t) => `Booking cancelled: ${t}`,
    heading: 'Booking cancelled',
    body: 'This booking has been cancelled.',
    cta: 'My bookings',
  },
};

const BOOKING_STRINGS: Record<EmailLocale, Record<BookingEmailKind, BookingStrings>> = {
  az: bookingAz,
  ru: bookingRu,
  en: bookingEn,
};

export const bookingEmailStrings = (locale: EmailLocale, kind: BookingEmailKind): BookingStrings =>
  BOOKING_STRINGS[locale][kind];

/** Shared row labels for the booking summary block. */
export const bookingLabels = (
  locale: EmailLocale,
): { dates: string; guests: string; total: string; reason: string } =>
  locale === 'az'
    ? { dates: 'Tarixlər', guests: 'Qonaq sayı', total: 'Cəmi', reason: 'Səbəb' }
    : locale === 'ru'
      ? { dates: 'Даты', guests: 'Гостей', total: 'Итого', reason: 'Причина' }
      : { dates: 'Dates', guests: 'Guests', total: 'Total', reason: 'Reason' };

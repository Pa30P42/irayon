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

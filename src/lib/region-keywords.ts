import type { SeoLocale } from '@/lib/seo';

/**
 * Long-tail SEO keywords per region × locale. Used by region landing pages
 * (`/[locale]/regions/[slug]`) which rank far better than `?region=` URL
 * params for queries like "villa rental Gabala".
 *
 * Slugs match the `Region.slug` column in the DB. Add an entry when adding a
 * new region to seed.
 */
export const REGION_KEYWORDS: Record<string, Record<SeoLocale, string[]>> = {
  gabala: {
    az: ['Qəbələdə villa kirayəsi', 'Qəbələdə istirahət evi', 'Qəbələ günlük kirayə'],
    ru: ['аренда виллы Габала', 'снять дом Габала Азербайджан', 'отдых Габала природа'],
    en: ['villa rental Gabala Azerbaijan', 'Gabala nature retreat', 'Gabala cabin rent'],
  },
  ismayilli: {
    az: ['İsmayıllıda villa kirayəsi', 'İsmayıllıda istirahət evi', 'İsmayıllı günlük kirayə'],
    ru: ['аренда дома Исмаиллы', 'снять домик Исмаиллы природа'],
    en: ['Ismayilli villa rental', 'Ismayilli nature house Azerbaijan'],
  },
  sheki: {
    az: ['Şəkidə günlük kirayə', 'Şəki istirahət evi kirayəsi', 'Şəki villa'],
    ru: ['аренда дома Шеки', 'отдых в Шеки снять дом'],
    en: ['Sheki guesthouse rental', 'Sheki villa Azerbaijan'],
  },
  lankaran: {
    az: ['Lənkəranda istirahət evi', 'Lənkəran bağ evi kirayəsi', 'Lənkəran günlük kirayə'],
    ru: ['аренда дома Ленкорань', 'эко отдых Ленкорань лес'],
    en: ['Lankaran forest house rental', 'Lankaran eco retreat Azerbaijan'],
  },
  zagatala: {
    az: ['Zaqatalada villa kirayəsi', 'Zaqatala istirahət evi', 'Zaqatala günlük kirayə'],
    ru: ['аренда дома Загатала', 'загородный дом Загатала'],
    en: ['Zagatala villa rent', 'Zagatala nature retreat Azerbaijan'],
  },
  guba: {
    az: ['Qubada bağ evi kirayəsi', 'Quba dağ evi', 'Quba günlük kirayə'],
    ru: ['аренда дома Куба Азербайджан', 'горный домик Куба'],
    en: ['Quba mountain cabin Azerbaijan', 'villa rental Quba'],
  },
  gusar: {
    az: ['Qusarda villa kirayəsi', 'Şahdağ yaxınlığında ev', 'Qusar dağ evi'],
    ru: ['аренда виллы Гусар', 'дом у Шахдага', 'снять домик Гусар'],
    en: ['Gusar villa rental', 'Shahdag cabin Azerbaijan', 'Qusar mountain house'],
  },
  gakh: {
    az: ['Qaxda istirahət evi', 'Qax çay sahili evi', 'Qax günlük kirayə'],
    ru: ['аренда дома Гах', 'дом у реки Гах'],
    en: ['Gakh riverside cabin', 'Gakh house rental Azerbaijan'],
  },
  goychay: {
    az: ['Göyçayda villa kirayəsi', 'Göyçay nar bağı evi'],
    ru: ['аренда дома Гёйчай', 'дом среди гранатовых садов Гёйчай'],
    en: ['Goychay villa rental', 'Goychay pomegranate orchard house'],
  },
  absheron: {
    az: ['Abşeronda dəniz kənarı villa', 'Bakı yaxınlığında istirahət evi'],
    ru: ['прибрежная вилла Апшерон', 'дом у моря рядом с Баку'],
    en: ['Absheron seaside villa', 'Caspian coast house near Baku'],
  },
  lerik: {
    az: ['Lerik dağ evi', 'Lerik günlük kirayə', 'Lerik təbiət evi'],
    ru: ['Лерик горный дом', 'Лерик аренда домика'],
    en: ['Lerik mountain cabin', 'Lerik nature house Azerbaijan'],
  },
};

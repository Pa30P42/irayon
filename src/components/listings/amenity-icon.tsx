import type { Amenity } from '@/types';
import {
  IconAirConditioning,
  IconBabyCarriage,
  IconBath,
  IconBubble,
  IconCar,
  IconChargingPile,
  IconDeviceTv,
  IconFlame,
  IconGrillFork,
  IconIroning,
  IconMoodKid,
  IconPaw,
  IconSwimming,
  IconTemperature,
  IconToolsKitchen2,
  IconWashMachine,
  IconWifi,
  IconWind,
  type Icon,
} from '@tabler/icons-react';

const ICONS: Record<Amenity, Icon> = {
  wifi: IconWifi,
  parking: IconCar,
  pool: IconSwimming,
  sauna: IconBath,
  jacuzzi: IconBubble,
  fireplace: IconFlame,
  kitchen: IconToolsKitchen2,
  bbq: IconGrillFork,
  pets: IconPaw,
  heating: IconTemperature,
  ac: IconAirConditioning,
  tv: IconDeviceTv,
  washer: IconWashMachine,
  iron: IconIroning,
  hairdryer: IconWind,
  crib: IconBabyCarriage,
  kids: IconMoodKid,
  'ev-charger': IconChargingPile,
};

type AmenityIconProps = {
  amenity: Amenity;
  className?: string;
  size?: number;
  /**
   * Accessible label. Defaults to `aria-hidden` so the icon is decorative —
   * the parent (e.g. ListingCard's amenities list) is responsible for naming
   * the visible item with a localized string.
   */
  label?: string;
};

export function AmenityIcon({ amenity, className, size = 16, label }: AmenityIconProps) {
  const Icon = ICONS[amenity];
  return label ? (
    <Icon size={size} className={className} aria-label={label} />
  ) : (
    <Icon size={size} className={className} aria-hidden />
  );
}

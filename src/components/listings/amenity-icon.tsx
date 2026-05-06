import {
  IconWifi,
  IconCar,
  IconSwimming,
  IconFlame,
  IconToolsKitchen2,
  IconGrillFork,
  IconPaw,
  IconTemperature,
  IconAirConditioning,
  IconDeviceTv,
  IconWashMachine,
  IconBath,
  type Icon,
} from '@tabler/icons-react';
import type { Amenity } from '@/types';

const ICONS: Record<Amenity, Icon> = {
  wifi: IconWifi,
  parking: IconCar,
  pool: IconSwimming,
  sauna: IconBath,
  fireplace: IconFlame,
  kitchen: IconToolsKitchen2,
  bbq: IconGrillFork,
  pets: IconPaw,
  heating: IconTemperature,
  ac: IconAirConditioning,
  tv: IconDeviceTv,
  washer: IconWashMachine,
};

type AmenityIconProps = {
  amenity: Amenity;
  className?: string;
  size?: number;
};

export function AmenityIcon({ amenity, className, size = 16 }: AmenityIconProps) {
  const Icon = ICONS[amenity];
  return <Icon size={size} className={className} aria-label={amenity} />;
}

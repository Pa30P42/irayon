import type { Activity, ListingCategory, ListingStatus, Meal, PlaceType } from '@/types';
import type { $Enums } from '@prisma/client';

/**
 * Typed bridges between the DTO string form (e.g. `'a-frame'`) and the
 * generated Prisma enum (e.g. `$Enums.PlaceType.A_FRAME`). One place for the
 * casts so `tsc` flags enum drift instead of swallowing it through `as never`.
 */

export const toPlaceType = (v: PlaceType): $Enums.PlaceType =>
  v.toUpperCase().replace(/-/g, '_') as $Enums.PlaceType;

export const toCategory = (v: ListingCategory): $Enums.ListingCategory =>
  v.toUpperCase() as $Enums.ListingCategory;

export const toMeal = (v: Meal): $Enums.Meal => v.toUpperCase().replace(/-/g, '_') as $Enums.Meal;

export const toActivity = (v: Activity): $Enums.Activity => v.toUpperCase() as $Enums.Activity;

export const toListingStatus = (v: ListingStatus): $Enums.ListingStatus =>
  v.toUpperCase() as $Enums.ListingStatus;

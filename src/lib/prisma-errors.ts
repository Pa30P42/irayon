import { Prisma } from '@prisma/client';

/**
 * True when `err` is a P2002 unique-constraint violation on `target`. Lets
 * write paths attempt the insert/update and handle the conflict, instead of
 * paying an extra existence-check query that the constraint already enforces
 * race-free.
 *
 * Pass a single column name to match any constraint involving it, or the full
 * column list of a composite (`['regionId', 'slug']`) to match that
 * constraint exactly — so a future constraint that merely shares a column
 * isn't mistaken for this one.
 */
export const isUniqueConstraintError = (err: unknown, target: string | string[]): boolean => {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;

  const meta = err.meta?.target;
  const fields = Array.isArray(meta) ? (meta as string[]) : String(meta ?? '').split(/[,\s]+/);

  if (Array.isArray(target)) {
    return target.length === fields.length && target.every((column) => fields.includes(column));
  }
  return Array.isArray(meta) ? fields.includes(target) : String(meta ?? '').includes(target);
};

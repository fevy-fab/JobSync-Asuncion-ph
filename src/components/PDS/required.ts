import type { OverlayField } from '@/components/PDS/overlay/PDFOverlayRenderer';

type AnyObj = Record<string, any>;

const get = (obj: AnyObj, path: string) => {
  if (!obj) return undefined;
  return path.split('.').reduce((acc: any, key) => {
    if (acc == null) return undefined;
    // array path support: children.0.fullName
    if (key.match(/^\d+$/)) return acc[Number(key)];
    return acc[key];
  }, obj);
};

const isFilled = (v: any) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return !Number.isNaN(v);
  if (typeof v === 'boolean') return v === true; // for required checkboxes
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return Boolean(v);
};

export type RequiredCheckResult = {
  ok: boolean;
  missing: Array<{ path: string; label: string }>;
};

export const buildRequiredPathsFromOverlay = (fields: OverlayField[]) => {
  // Only fields explicitly required OR conditionally required
  return fields.filter((f) => f.required || f.requiredWhen);
};

export const checkRequiredByOverlay = (
  allValues: AnyObj,
  fields: OverlayField[]
): RequiredCheckResult => {
  const requiredFields = buildRequiredPathsFromOverlay(fields);

  const missing = requiredFields
    .filter((f) => {
      const shouldRequire = f.requiredWhen ? !!f.requiredWhen(allValues) : !!f.required;
      if (!shouldRequire) return false;

      const value = get(allValues, f.name);
      return !isFilled(value);
    })
    .map((f) => ({ path: f.name, label: f.label || f.name }));

  return { ok: missing.length === 0, missing };
};

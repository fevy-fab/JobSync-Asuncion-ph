import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PDSData } from '@/types/pds.types';

import fs from 'fs/promises';
import path from 'path';
import { Buffer } from 'buffer';

import { PDS_PDF_MAP, yFromTop } from './pdfMapper';
import {
  formatDateForCSC,
  formatYearForCSC,
  formatDateRangeForCSC,
  formatHeight,
  formatWeight,
  formatHours,
  formatSalary,
  getCurrentDateCSC,
} from './dateFormatters';

type PdfGenOptions = {
  includeSignature?: boolean;
  useCurrentDate?: boolean;
  returnBytes?: boolean; // kept for backwards-compat (function already returns bytes)
  debugGrid?: boolean;
  drawCheckboxes?: boolean;

  calibration?: {
    enabled?: boolean;

    // what to show
    showPoints?: boolean; // PdfPoint markers
    showRects?: boolean; // PdfRect outlines
    showTables?: boolean; // table rows/columns

    tableRows?: number; // default 3
    onlyPages?: Array<'page1' | 'page2' | 'page3' | 'page4'>; // filter pages
    onlyPathsPrefix?: string[]; // e.g. ['page2.workExperience', 'page1.personalInfo']

    // layout
    markerStyle?: 'numbered-dot' | 'crosshair';
    legendPlacement?: 'right' | 'bottom';
    legendMaxLines?: number; // default 40
  };
};

const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'PDS_2025_Template.pdf');
const ARIAL_NARROW_PATH = path.join(process.cwd(), 'public', 'fonts', 'ArialNarrow.ttf');

// ✅ Defaults (tweak once here)
const FONT_SIZE = 7.3;
const FONT_SIZE_SMALL = 7;
const CHECKBOX_SIZE = 8;
const LINE_HEIGHT = 8;

async function loadTemplateBytes(): Promise<Uint8Array> {
  try {
    console.log('📄 Loading PDF template from:', TEMPLATE_PATH);
    const buf = await fs.readFile(TEMPLATE_PATH);
    console.log('✅ Template loaded successfully, size:', buf.length, 'bytes');
    return new Uint8Array(buf);
  } catch (err) {
    console.error('❌ Failed to load PDF template from:', TEMPLATE_PATH);
    console.error('Error:', err);
    throw new Error(
      `Could not load PDS_2025_Template.pdf: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function tryLoadArialNarrowBytes(): Promise<Uint8Array | null> {
  try {
    const buf = await fs.readFile(ARIAL_NARROW_PATH);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function safeText(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function fitTextToWidth(font: any, text: string, size: number, maxWidth: number): string {
  let t = safeText(text);
  while (t.length > 0 && font.widthOfTextAtSize(t, size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t;
}

function drawTextWrapped(params: {
  page: any;
  font: any;
  text: string;
  x: number;
  y: number;
  size: number;
  maxWidth: number;
  lineHeight?: number;
  maxLines?: number;
}) {
  const { page, font, text, x, y, size, maxWidth } = params;
  const lineHeight = params.lineHeight ?? size + 2;
  const maxLines = params.maxLines ?? 3;

  const words = safeText(text).split(/\s+/).filter(Boolean);
  let line = '';
  let cursorY = y;
  let lineCount = 0;

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);

    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) {
        page.drawText(line, { x, y: cursorY, size, font });
        lineCount++;
        if (lineCount >= maxLines) return;
      }
      cursorY -= lineHeight;
      line = w;
    }
  }

  if (line && lineCount < maxLines) {
    page.drawText(line, { x, y: cursorY, size, font });
  }
}

/* ============================================================
   ✅ CHECKMARK (FONT-INDEPENDENT)
   Draws a ✓ using two lines so it NEVER becomes "[]"
============================================================ */
function drawCheckMark(page: any, x: number, y: number, size: number) {
  const s = size;

  const x1 = x + s * 0.1;
  const y1 = y + s * 0.35;

  const x2 = x + s * 0.35;
  const y2 = y + s * 0.1;

  const x3 = x + s * 0.9;
  const y3 = y + s * 0.85;

  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 1.2,
  });

  page.drawLine({
    start: { x: x2, y: y2 },
    end: { x: x3, y: y3 },
    thickness: 1.2,
  });
}

/** Checkbox wrapper (keeps same signature, but ignores font) */
function drawCheckbox(page: any, _font: any, x: number, y: number, checked: boolean) {
  if (!checked) return;
  drawCheckMark(page, x, y, CHECKBOX_SIZE);
}

/** Debug grid overlay to calibrate */
function drawDebugGrid(pdfDoc: PDFDocument) {
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();

    for (let x = 0; x <= width; x += 20) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: 0.2,
        color: rgb(0.85, 0.85, 0.85),
      });
    }
    for (let y = 0; y <= height; y += 20) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: 0.2,
        color: rgb(0.85, 0.85, 0.85),
      });
    }

    const fontSize = 6;
    page.drawText(`0,0`, { x: 2, y: 2, size: fontSize, color: rgb(0.35, 0.35, 0.35) });
    for (let x = 0; x <= width; x += 100) {
      page.drawText(`${x}`, { x: x + 2, y: 2, size: fontSize, color: rgb(0.35, 0.35, 0.35) });
    }
    for (let y = 0; y <= height; y += 100) {
      page.drawText(`${y}`, { x: 2, y: y + 2, size: fontSize, color: rgb(0.35, 0.35, 0.35) });
    }
  }
}

/** Generic table drawer */
function drawTableRows(params: {
  rows: any[];
  startTop: number;
  rowStep: number;
  maxRows: number;
  drawRow: (row: any, rowTop: number, idx: number) => void;
}) {
  const { rows, startTop, rowStep, maxRows, drawRow } = params;
  const count = Math.min(rows?.length || 0, maxRows);
  for (let i = 0; i < count; i++) {
    const rowTop = startTop + i * rowStep; // top-based
    drawRow(rows[i], rowTop, i);
  }
}

/* ============================================================
   ✅ EDUCATION ROW PLACEMENT (FIXED 5 SLOTS BY LEVEL)
============================================================ */
type EduEntry = any;

function normalizeEduLevel(raw: any): string {
  const s = safeText(raw).trim().toLowerCase();
  if (!s) return '';

  if (s.includes('elementary')) return 'elementary';
  if (s.includes('secondary') || s.includes('high school') || s.includes('hs')) return 'secondary';
  if (s.includes('vocational') || s.includes('trade') || s.includes('tesda')) return 'vocational';
  if (s.includes('college') || s.includes('bachelor') || s.includes('undergraduate')) return 'college';
  if (s.includes('graduate') || s.includes('master') || s.includes('doctor') || s.includes('phd') || s.includes('post')) {
    return 'graduate';
  }

  return s;
}

function inferEduLevelFromCourse(row: EduEntry): string {
  const course = safeText(row?.basicEducationDegreeCourse || row?.basicEducationDegree || row?.course || '').toLowerCase();
  if (!course) return '';

  if (course.includes('doctor') || course.includes('phd') || course.includes('master')) return 'graduate';
  if (course.includes('bachelor') || course.includes('bs') || course.includes('ba')) return 'college';
  if (course.includes('tesda') || course.includes('nc ') || course.includes('trade') || course.includes('vocational')) return 'vocational';

  return '';
}

function eduSlotIndex(row: EduEntry): number | null {
  const lvl = normalizeEduLevel(row?.level);
  if (lvl === 'elementary') return 0;
  if (lvl === 'secondary') return 1;
  if (lvl === 'vocational') return 2;
  if (lvl === 'college') return 3;
  if (lvl === 'graduate') return 4;

  const inferred = inferEduLevelFromCourse(row);
  if (inferred === 'elementary') return 0;
  if (inferred === 'secondary') return 1;
  if (inferred === 'vocational') return 2;
  if (inferred === 'college') return 3;
  if (inferred === 'graduate') return 4;

  return null;
}

function placeEducationIntoFixedRows(eduArr: EduEntry[], maxRows = 5): (EduEntry | null)[] {
  const out: (EduEntry | null)[] = new Array(maxRows).fill(null);

  for (const row of Array.isArray(eduArr) ? eduArr : []) {
    const idx = eduSlotIndex(row);

    if (idx !== null && idx >= 0 && idx < maxRows) {
      if (!out[idx]) {
        out[idx] = row;
      } else {
        const nextEmpty = out.findIndex((x) => !x);
        if (nextEmpty !== -1) out[nextEmpty] = row;
      }
    } else {
      const nextEmpty = out.findIndex((x) => !x);
      if (nextEmpty !== -1) out[nextEmpty] = row;
    }
  }

  return out;
}

/* ============================================================
   ✅ CALIBRATION MODE (REDESIGNED)
============================================================ */

type CalItem = {
  pageIndex: number;
  x: number;
  y: number; // PDF y
  yTop: number; // top-based y
  label: string; // full path
  kind: 'point' | 'rect' | 'tableCol' | 'tableRow';
  rect?: { x: number; y: number; w: number; h: number }; // for rect outlines
};

function isPdfPoint(v: any): v is { x: number; y: number } {
  return v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number';
}

function isPdfRect(v: any): v is { x: number; y: number; w: number; h: number } {
  return v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.w === 'number' && typeof v.h === 'number';
}

function shortPath(p: string) {
  return p.replace(/^page(\d)\./, 'P$1.');
}

function yTopFromPdfY(y: number, pageHeight: number) {
  return Math.round(pageHeight - y);
}

function drawNumberedDot(page: any, x: number, y: number, n: number) {
  const r = 5;
  page.drawCircle({ x, y, size: r, color: rgb(1, 1, 1), borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 0.8 });
  page.drawText(String(n), { x: x - 2.2, y: y - 2.3, size: 6, color: rgb(0, 0, 0) });
}

function drawCrosshairTiny(page: any, x: number, y: number) {
  const s = 4;
  page.drawLine({ start: { x: x - s, y }, end: { x: x + s, y }, thickness: 0.6, color: rgb(0.1, 0.1, 0.1) });
  page.drawLine({ start: { x, y: y - s }, end: { x, y: y + s }, thickness: 0.6, color: rgb(0.1, 0.1, 0.1) });
}

function drawRectOutline(page: any, rect: { x: number; y: number; w: number; h: number }) {
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
    borderWidth: 1,
    borderColor: rgb(0.1, 0.1, 0.1),
    opacity: 1,
  });
}

function looksLikeTable(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  return keys.includes('startTop') && keys.includes('rowStep') && keys.includes('maxRows') && keys.some((k) => /X$/.test(k) && typeof obj[k] === 'number');
}

function collectCalibrationItems(
  map: any,
  pageHeight: number,
  cfg: Required<NonNullable<PdfGenOptions['calibration']>>
): CalItem[] {
  const items: CalItem[] = [];
  const pageKeys: Array<'page1' | 'page2' | 'page3' | 'page4'> = ['page1', 'page2', 'page3', 'page4'];

  const allowedPages = cfg.onlyPages?.length ? new Set(cfg.onlyPages) : null;
  const prefixes = cfg.onlyPathsPrefix?.length ? cfg.onlyPathsPrefix : null;

  function allowedPath(pathStr: string) {
    if (!prefixes) return true;
    return prefixes.some((p) => pathStr.startsWith(p));
  }

  function walk(obj: any, pageIndex: number, pathStr: string) {
    if (!obj || typeof obj !== 'object') return;
    if (!allowedPath(pathStr)) return;

    if (cfg.showPoints && isPdfPoint(obj)) {
      items.push({
        pageIndex,
        x: obj.x,
        y: obj.y,
        yTop: yTopFromPdfY(obj.y, pageHeight),
        label: pathStr,
        kind: 'point',
      });
      return;
    }

    if (cfg.showRects && isPdfRect(obj)) {
      // represent rect by its top-left corner in legend + store rect for outline
      const topLeftY = obj.y + obj.h;
      items.push({
        pageIndex,
        x: obj.x,
        y: topLeftY,
        yTop: yTopFromPdfY(topLeftY, pageHeight),
        label: `${pathStr} (rect ${obj.w}x${obj.h})`,
        kind: 'rect',
        rect: { x: obj.x, y: obj.y, w: obj.w, h: obj.h },
      });
      return;
    }

    if (cfg.showTables && looksLikeTable(obj)) {
      const startTop = obj.startTop;
      const rowStep = obj.rowStep;
      const maxRows = obj.maxRows;
      const xKeys = Object.keys(obj).filter((k) => /X$/.test(k) && typeof obj[k] === 'number');

      const rows = Math.min(cfg.tableRows, typeof maxRows === 'number' ? maxRows : cfg.tableRows);

      for (let i = 0; i < rows; i++) {
        const yTop = startTop + i * rowStep;
        const y = yFromTop(yTop, pageHeight);

        items.push({
          pageIndex,
          x: 30,
          y,
          yTop,
          label: `${pathStr}.row[${i}]`,
          kind: 'tableRow',
        });

        if (i === 0) {
          for (const k of xKeys) {
            const x = obj[k];
            items.push({
              pageIndex,
              x,
              y,
              yTop,
              label: `${pathStr}.${k}`,
              kind: 'tableCol',
            });
          }
        }
      }
      // do not return; keep walking in case nested points exist
    }

    for (const k of Object.keys(obj)) {
      walk(obj[k], pageIndex, pathStr ? `${pathStr}.${k}` : k);
    }
  }

  for (let i = 0; i < pageKeys.length; i++) {
    const pk = pageKeys[i];
    if (allowedPages && !allowedPages.has(pk)) continue;
    walk(map[pk], i, pk);
  }

  return items;
}

function drawLegend(page: any, font: any, items: Array<{ n: number; text: string }>, placement: 'right' | 'bottom') {
  const { width: pageW, height: pageH } = page.getSize();

  const padding = 6;
  const lineH = 8;
  const fontSize = 6;

  const box =
    placement === 'right'
      ? { x: Math.max(pageW - 252, 20), y: 60, w: Math.min(240, pageW - 40), h: pageH - 120 }
      : { x: 30, y: 30, w: pageW - 60, h: 160 };

  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    color: rgb(1, 1, 1),
    opacity: 0.88,
    borderWidth: 1,
    borderColor: rgb(0.75, 0.75, 0.75),
  });

  page.drawText('CALIBRATION LEGEND', {
    x: box.x + padding,
    y: box.y + box.h - padding - 8,
    size: 7,
    font,
    color: rgb(0, 0, 0),
  });

  let cursorY = box.y + box.h - padding - 18;
  for (const it of items) {
    if (cursorY < box.y + padding + 8) break;
    page.drawText(it.text, { x: box.x + padding, y: cursorY, size: fontSize, font, color: rgb(0, 0, 0) });
    cursorY -= lineH;
  }
}

function drawCalibrationOverlayRedesigned(params: {
  pdfDoc: PDFDocument;
  font: any;
  map: any;
  cfg: Required<NonNullable<PdfGenOptions['calibration']>>;
}) {
  const { pdfDoc, font, map, cfg } = params;
  const pages = pdfDoc.getPages();

  // IMPORTANT: page sizes can differ; collector uses page0 height for yTop
  const pageHeight = pages[0].getSize().height;

  const rawItems = collectCalibrationItems(map, pageHeight, cfg);

  const byPage = new Map<number, CalItem[]>();
  for (const it of rawItems) {
    const arr = byPage.get(it.pageIndex) || [];
    arr.push(it);
    byPage.set(it.pageIndex, arr);
  }

  for (const [pageIndex, items] of byPage.entries()) {
    const page = pages[pageIndex];
    items.sort((a, b) => b.yTop - a.yTop);

    const numbered = items.map((it, idx) => ({ ...it, n: idx + 1 }));

    for (const it of numbered) {
      if (it.kind === 'rect' && it.rect) {
        drawRectOutline(page, it.rect);
      }

      if (cfg.markerStyle === 'crosshair') {
        drawCrosshairTiny(page, it.x, it.y);
      } else {
        drawNumberedDot(page, it.x, it.y, it.n);
      }

      if (it.kind === 'tableRow') {
        const { width } = page.getSize();
        page.drawLine({
          start: { x: 30, y: it.y },
          end: { x: width - 30, y: it.y },
          thickness: 0.25,
          color: rgb(0.8, 0.8, 0.8),
        });
      }
    }

    const legendLines = numbered.slice(0, cfg.legendMaxLines).map((it) => {
      const t = shortPath(it.label);
      const coords = `x=${Math.round(it.x)} yTop=${it.yTop}`;
      return { n: it.n, text: `${String(it.n).padStart(2, '0')}. ${t}  (${coords})` };
    });

    drawLegend(page, font, legendLines, cfg.legendPlacement);
  }
}

function flattenFormsIfAny(pdfDoc: PDFDocument) {
  try {
    const form = pdfDoc.getForm();
    form.flatten();
  } catch {
    // no-op
  }
}

/**
 * ✅ PDF Generator
 */
export async function generateOfficialPDF(
  pdsData: Partial<PDSData>,
  options: PdfGenOptions = {}
): Promise<Uint8Array> {
  const includeSignature = options.includeSignature ?? false;
  const useCurrentDate = options.useCurrentDate ?? false;
  const debugGrid = options.debugGrid ?? false; //TURN OFF   AFTER RECALIBRATING
  const drawCheckboxes = options.drawCheckboxes ?? true;

  // --- Load template + setup doc/font FIRST ---
  const templateBytes = await loadTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);

  // ✅ Flatten any form fields/widgets that can cover drawn content (e.g., signature)
  flattenFormsIfAny(pdfDoc);

  pdfDoc.registerFontkit(fontkit);

  const arialBytes = await tryLoadArialNarrowBytes();
  let font: any;
  if (arialBytes) {
    font = await pdfDoc.embedFont(arialBytes, { subset: true });
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    console.warn('⚠ ArialNarrow.ttf not found. Falling back to Helvetica.');
  }

  const pages = pdfDoc.getPages();
  if (pages.length < 4) {
    throw new Error(`Template PDF has only ${pages.length} page(s). Expected at least 4.`);
  }

  if (debugGrid) drawDebugGrid(pdfDoc);

  // ✅ Calibration overlay (must be AFTER pdfDoc + font exist)
  const cal = options.calibration ?? {};
  const calibrationEnabled = cal.enabled ?? false;
  if (calibrationEnabled) {
    drawCalibrationOverlayRedesigned({
      pdfDoc,
      font,
      map: PDS_PDF_MAP,
      cfg: {
        enabled: true,
        showPoints: cal.showPoints ?? true,
        showRects: cal.showRects ?? true,
        showTables: cal.showTables ?? true,
        tableRows: cal.tableRows ?? 3,
        onlyPages: cal.onlyPages ?? [],
        onlyPathsPrefix: cal.onlyPathsPrefix ?? [],
        markerStyle: cal.markerStyle ?? 'numbered-dot',
        legendPlacement: cal.legendPlacement ?? 'right',
        legendMaxLines: cal.legendMaxLines ?? 40,
      },
    });
  }

  // ==========================================================
  // PAGE 1 — PERSONAL INFO, FAMILY BACKGROUND, EDUCATION
  // ==========================================================
  const page1 = pages[0];
  const m1 = PDS_PDF_MAP.page1;

  const pi: any = (pdsData as any).personalInfo || {};
  const fb: any = (pdsData as any).familyBackground || {};
  const eduArr: any[] = (pdsData as any).educationalBackground || [];

  // Names
  page1.drawText(fitTextToWidth(font, safeText(pi.surname), FONT_SIZE, 200), {
    x: m1.surname.x,
    y: m1.surname.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.firstName), FONT_SIZE, 200), {
    x: m1.firstName.x,
    y: m1.firstName.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.middleName), FONT_SIZE, 200), {
    x: m1.middleName.x,
    y: m1.middleName.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.nameExtension || ''), FONT_SIZE, 80), {
    x: m1.nameExtension.x,
    y: m1.nameExtension.y,
    size: FONT_SIZE,
    font,
  });

  // Birth
  page1.drawText(fitTextToWidth(font, formatDateForCSC(pi.dateOfBirth), FONT_SIZE, 120), {
    x: m1.dateOfBirth.x,
    y: m1.dateOfBirth.y,
    size: FONT_SIZE,
    font,
  });
  drawTextWrapped({
    page: page1,
    font,
    text: safeText(pi.placeOfBirth || ''),
    x: m1.placeOfBirth.x,
    y: m1.placeOfBirth.y,
    size: FONT_SIZE_SMALL,
    maxWidth: 210,
    lineHeight: LINE_HEIGHT,
    maxLines: 2,
  });

  // Sex checkboxes ✅ FIXED (female no longer triggers male)
  if (drawCheckboxes && (m1 as any).sexMale && (m1 as any).sexFemale) {
    const sexRaw = String(pi.sex ?? pi.gender ?? pi.sexAtBirth ?? pi.genderAtBirth ?? '').trim().toLowerCase();
    const sex = sexRaw.replace(/\./g, '');

    const isFemale = sex === 'female' || sex === 'f' || sex === 'woman' || sex === '2';
    const isMale = sex === 'male' || sex === 'm' || sex === 'man' || sex === '1' || sex === '0';

    drawCheckbox(page1, font, (m1 as any).sexMale.x, (m1 as any).sexMale.y, isMale);
    drawCheckbox(page1, font, (m1 as any).sexFemale.x, (m1 as any).sexFemale.y, isFemale);
  }

  // Civil status ✅ now draws ✓ using lines
  if (drawCheckboxes && pi.civilStatus && (m1 as any).civilStatusSingle) {
    const csRaw = String(pi.civilStatus).trim().toLowerCase();
    const isSingle = csRaw === 'single';
    const isMarried = csRaw === 'married';
    const isWidowed = csRaw === 'widowed';
    const isSeparated = csRaw === 'separated';
    const isOthers = csRaw === 'others' || csRaw === 'other';

    drawCheckbox(page1, font, (m1 as any).civilStatusSingle.x, (m1 as any).civilStatusSingle.y, isSingle);
    drawCheckbox(page1, font, (m1 as any).civilStatusMarried.x, (m1 as any).civilStatusMarried.y, isMarried);
    drawCheckbox(page1, font, (m1 as any).civilStatusWidowed.x, (m1 as any).civilStatusWidowed.y, isWidowed);
    drawCheckbox(page1, font, (m1 as any).civilStatusSeparated.x, (m1 as any).civilStatusSeparated.y, isSeparated);
    drawCheckbox(page1, font, (m1 as any).civilStatusOthers.x, (m1 as any).civilStatusOthers.y, isOthers);

    if (isOthers && pi.civilStatusOthers && (m1 as any).civilStatusOthersText) {
      page1.drawText(fitTextToWidth(font, safeText(pi.civilStatusOthers), FONT_SIZE_SMALL, 130), {
        x: (m1 as any).civilStatusOthersText.x,
        y: (m1 as any).civilStatusOthersText.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }
  }

  // Citizenship ✅ now draws ✓ using lines
  if (drawCheckboxes) {
    const citizenshipRaw = String(pi.citizenship || "").trim().toLowerCase();
    const dualTypeRaw = String(
      pi.dualCitizenshipType || (pi as any).dualCitizenship || ""
    )
      .trim()
      .toLowerCase();

    const isFilipino =
      citizenshipRaw === "filipino" || citizenshipRaw.includes("filip");

    const isDual =
      citizenshipRaw.includes("dual") ||
      (!!pi.dualCitizenshipCountry &&
        String(pi.dualCitizenshipCountry).trim().length > 0);

    const isDualByBirth =
      isDual && (dualTypeRaw.includes("birth") || dualTypeRaw.includes("by birth"));

    const isDualByNaturalization =
      isDual &&
      (dualTypeRaw.includes("natural") ||
        dualTypeRaw.includes("naturalization") ||
        dualTypeRaw.includes("by naturalization"));

    // Draw each checkbox independently (so one missing mapping won't block the others)
    if ((m1 as any).citizenshipFilipino) {
      drawCheckbox(
        page1,
        font,
        (m1 as any).citizenshipFilipino.x,
        (m1 as any).citizenshipFilipino.y,
        isFilipino
      );
    }

    // ✅ This is the missing "Dual Citizenship" main checkbox
    if ((m1 as any).citizenshipDual) {
      drawCheckbox(
        page1,
        font,
        (m1 as any).citizenshipDual.x,
        (m1 as any).citizenshipDual.y,
        isDual
      );
    }

    if ((m1 as any).citizenshipDualByBirth) {
      drawCheckbox(
        page1,
        font,
        (m1 as any).citizenshipDualByBirth.x,
        (m1 as any).citizenshipDualByBirth.y,
        isDualByBirth
      );
    }

    if ((m1 as any).citizenshipDualByNaturalization) {
      drawCheckbox(
        page1,
        font,
        (m1 as any).citizenshipDualByNaturalization.x,
        (m1 as any).citizenshipDualByNaturalization.y,
        isDualByNaturalization
      );
    }

    // If dual is true but no type chosen, default to checking "By Birth"
    if (
      isDual &&
      !isDualByBirth &&
      !isDualByNaturalization &&
      (m1 as any).citizenshipDualByBirth
    ) {
      drawCheckbox(
        page1,
        font,
        (m1 as any).citizenshipDualByBirth.x,
        (m1 as any).citizenshipDualByBirth.y,
        true
      );
    }
  }

  // Physical
  page1.drawText(fitTextToWidth(font, formatHeight(pi.height), FONT_SIZE, 80), {
    x: (m1 as any).height.x,
    y: (m1 as any).height.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, formatWeight(pi.weight), FONT_SIZE, 80), {
    x: (m1 as any).weight.x,
    y: (m1 as any).weight.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.bloodType || ''), FONT_SIZE, 80), {
    x: (m1 as any).bloodType.x,
    y: (m1 as any).bloodType.y,
    size: FONT_SIZE,
    font,
  });

  // Government IDs
  page1.drawText(fitTextToWidth(font, safeText(pi.umidNo || ''), FONT_SIZE, 250), {
    x: (m1 as any).umidNo.x,
    y: (m1 as any).umidNo.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.pagibigNo || ''), FONT_SIZE, 250), {
    x: (m1 as any).pagibigNo.x,
    y: (m1 as any).pagibigNo.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.philhealthNo || ''), FONT_SIZE, 250), {
    x: (m1 as any).philhealthNo.x,
    y: (m1 as any).philhealthNo.y,
    size: FONT_SIZE,
    font,
  });
  if ((m1 as any).sssNo) {
    page1.drawText(fitTextToWidth(font, safeText(pi.sssNo || ''), FONT_SIZE, 250), {
      x: (m1 as any).sssNo.x,
      y: (m1 as any).sssNo.y,
      size: FONT_SIZE,
      font,
    });
  }
  page1.drawText(fitTextToWidth(font, safeText(pi.philsysNo || ''), FONT_SIZE, 250), {
    x: (m1 as any).philsysNo.x,
    y: (m1 as any).philsysNo.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.tinNo || ''), FONT_SIZE, 250), {
    x: (m1 as any).tinNo.x,
    y: (m1 as any).tinNo.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.agencyEmployeeNo || ''), FONT_SIZE, 250), {
    x: (m1 as any).agencyEmployeeNo.x,
    y: (m1 as any).agencyEmployeeNo.y,
    size: FONT_SIZE,
    font,
  });

  if (pi.dualCitizenshipCountry && (m1 as any).dualCitizenshipCountry) {
    page1.drawText(fitTextToWidth(font, safeText(pi.dualCitizenshipCountry), FONT_SIZE, 150), {
      x: (m1 as any).dualCitizenshipCountry.x,
      y: (m1 as any).dualCitizenshipCountry.y,
      size: FONT_SIZE,
      font,
    });
  }

  // Addresses
  const ra = pi.residentialAddress || {};
  page1.drawText(fitTextToWidth(font, safeText(ra.houseBlockLotNo || ''), FONT_SIZE_SMALL, 95), {
    x: (m1 as any).residentialHouseNo.x,
    y: (m1 as any).residentialHouseNo.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(ra.street || ''), FONT_SIZE_SMALL, 120), {
    x: (m1 as any).residentialStreet.x,
    y: (m1 as any).residentialStreet.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(ra.subdivisionVillage || ''), FONT_SIZE_SMALL, 95), {
    x: (m1 as any).residentialSubdivision.x,
    y: (m1 as any).residentialSubdivision.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(ra.barangay || ''), FONT_SIZE_SMALL, 120), {
    x: (m1 as any).residentialBarangay.x,
    y: (m1 as any).residentialBarangay.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(ra.cityMunicipality || ''), FONT_SIZE_SMALL, 95), {
    x: (m1 as any).residentialCity.x,
    y: (m1 as any).residentialCity.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(ra.province || ''), FONT_SIZE_SMALL, 120), {
    x: (m1 as any).residentialProvince.x,
    y: (m1 as any).residentialProvince.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(ra.zipCode || ''), FONT_SIZE_SMALL, 80), {
    x: (m1 as any).residentialZip.x,
    y: (m1 as any).residentialZip.y,
    size: FONT_SIZE_SMALL,
    font,
  });

  const pa = pi.permanentAddress || {};
  const addr = pa.sameAsResidential ? ra : pa;
  page1.drawText(fitTextToWidth(font, safeText(addr.houseBlockLotNo || ''), FONT_SIZE_SMALL, 95), {
    x: (m1 as any).permanentHouseNo.x,
    y: (m1 as any).permanentHouseNo.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(addr.street || ''), FONT_SIZE_SMALL, 120), {
    x: (m1 as any).permanentStreet.x,
    y: (m1 as any).permanentStreet.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(addr.subdivisionVillage || ''), FONT_SIZE_SMALL, 95), {
    x: (m1 as any).permanentSubdivision.x,
    y: (m1 as any).permanentSubdivision.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(addr.barangay || ''), FONT_SIZE_SMALL, 120), {
    x: (m1 as any).permanentBarangay.x,
    y: (m1 as any).permanentBarangay.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(addr.cityMunicipality || ''), FONT_SIZE_SMALL, 95), {
    x: (m1 as any).permanentCity.x,
    y: (m1 as any).permanentCity.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(addr.province || ''), FONT_SIZE_SMALL, 120), {
    x: (m1 as any).permanentProvince.x,
    y: (m1 as any).permanentProvince.y,
    size: FONT_SIZE_SMALL,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(addr.zipCode || ''), FONT_SIZE_SMALL, 80), {
    x: (m1 as any).permanentZip.x,
    y: (m1 as any).permanentZip.y,
    size: FONT_SIZE_SMALL,
    font,
  });

  // Contact
  page1.drawText(fitTextToWidth(font, safeText(pi.telephoneNo || ''), FONT_SIZE, 150), {
    x: (m1 as any).telephoneNo.x,
    y: (m1 as any).telephoneNo.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.mobileNo || ''), FONT_SIZE, 150), {
    x: (m1 as any).mobileNo.x,
    y: (m1 as any).mobileNo.y,
    size: FONT_SIZE,
    font,
  });
  page1.drawText(fitTextToWidth(font, safeText(pi.emailAddress || ''), FONT_SIZE, 220), {
    x: (m1 as any).emailAddress.x,
    y: (m1 as any).emailAddress.y,
    size: FONT_SIZE,
    font,
  });

  // FAMILY BACKGROUND
  const spouse = fb.spouse;
  if (spouse) {
    page1.drawText(fitTextToWidth(font, safeText(spouse.surname || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).spouseSurname.x,
      y: (m1 as any).spouseSurname.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(spouse.firstName || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).spouseFirstName.x,
      y: (m1 as any).spouseFirstName.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(spouse.middleName || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).spouseMiddleName.x,
      y: (m1 as any).spouseMiddleName.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(spouse.occupation || ''), FONT_SIZE_SMALL, 240), {
      x: (m1 as any).spouseOccupation.x,
      y: (m1 as any).spouseOccupation.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(spouse.employerBusinessName || ''), FONT_SIZE_SMALL, 240), {
      x: (m1 as any).spouseEmployer.x,
      y: (m1 as any).spouseEmployer.y,
      size: FONT_SIZE_SMALL,
      font,
    });

    drawTextWrapped({
      page: page1,
      font,
      text: safeText(spouse.businessAddress || ''),
      x: (m1 as any).spouseBusinessAddress.x,
      y: (m1 as any).spouseBusinessAddress.y,
      size: FONT_SIZE_SMALL,
      maxWidth: 300,
      lineHeight: LINE_HEIGHT,
      maxLines: 2,
    });

    page1.drawText(fitTextToWidth(font, safeText(spouse.telephoneNo || ''), FONT_SIZE_SMALL, 160), {
      x: (m1 as any).spouseTelephone.x,
      y: (m1 as any).spouseTelephone.y,
      size: FONT_SIZE_SMALL,
      font,
    });
  }

  if (fb.father) {
    page1.drawText(fitTextToWidth(font, safeText(fb.father.surname || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).fatherSurname.x,
      y: (m1 as any).fatherSurname.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(fb.father.firstName || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).fatherFirstName.x,
      y: (m1 as any).fatherFirstName.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(fb.father.middleName || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).fatherMiddleName.x,
      y: (m1 as any).fatherMiddleName.y,
      size: FONT_SIZE_SMALL,
      font,
    });
  }

  if (fb.mother) {
    page1.drawText(fitTextToWidth(font, safeText(fb.mother.surname || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).motherSurname.x,
      y: (m1 as any).motherSurname.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(fb.mother.firstName || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).motherFirstName.x,
      y: (m1 as any).motherFirstName.y,
      size: FONT_SIZE_SMALL,
      font,
    });
    page1.drawText(fitTextToWidth(font, safeText(fb.mother.middleName || ''), FONT_SIZE_SMALL, 220), {
      x: (m1 as any).motherMiddleName.x,
      y: (m1 as any).motherMiddleName.y,
      size: FONT_SIZE_SMALL,
      font,
    });
  }

  const kids = fb.children ?? [];
  if (Array.isArray(kids) && (m1 as any).childrenNameX) {
    for (let i = 0; i < Math.min(kids.length, (m1 as any).childrenMaxRows); i++) {
      const rowTop = (m1 as any).childrenStartTop + i * (m1 as any).childrenRowStep;
      const name = kids[i]?.fullName || '';
      const dob = formatDateForCSC(kids[i]?.dateOfBirth);

      page1.drawText(fitTextToWidth(font, safeText(name), FONT_SIZE_SMALL, 180), {
        x: (m1 as any).childrenNameX,
        y: yFromTop(rowTop),
        size: FONT_SIZE_SMALL,
        font,
      });
      page1.drawText(fitTextToWidth(font, safeText(dob), FONT_SIZE_SMALL, 80), {
        x: (m1 as any).childrenDobX,
        y: yFromTop(rowTop),
        size: FONT_SIZE_SMALL,
        font,
      });
    }
  }

  if (Array.isArray(eduArr) && (m1 as any).educational) {
    const eduMap = (m1 as any).educational;
    const fixedRows = placeEducationIntoFixedRows(eduArr, eduMap.maxRows ?? 5);

    for (let slot = 0; slot < Math.min(fixedRows.length, eduMap.maxRows); slot++) {
      const row = fixedRows[slot];
      if (!row) continue;

      const rowTop = eduMap.startTop + slot * eduMap.rowStep;
      const y = yFromTop(rowTop);

      page1.drawText(fitTextToWidth(font, safeText(row.nameOfSchool || ''), FONT_SIZE_SMALL, 160), {
        x: eduMap.nameOfSchoolX,
        y,
        size: FONT_SIZE_SMALL,
        font,
      });

      drawTextWrapped({
        page: page1,
        font,
        text: safeText(row.basicEducationDegreeCourse || ''),
        x: eduMap.basicEducationX,
        y,
        size: FONT_SIZE_SMALL,
        maxWidth: eduMap.basicEducationMaxWidth ?? 155,
        lineHeight: 7,
        maxLines: 2,
      });

      page1.drawText(fitTextToWidth(font, formatYearForCSC(row?.periodOfAttendance?.from), FONT_SIZE_SMALL, 35), {
        x: eduMap.fromX,
        y,
        size: FONT_SIZE_SMALL,
        font,
      });

      page1.drawText(fitTextToWidth(font, formatYearForCSC(row?.periodOfAttendance?.to), FONT_SIZE_SMALL, 35), {
        x: eduMap.toX,
        y,
        size: FONT_SIZE_SMALL,
        font,
      });

      page1.drawText(fitTextToWidth(font, safeText(row.highestLevelUnitsEarned || ''), FONT_SIZE_SMALL, 45), {
        x: eduMap.highestLevelX,
        y,
        size: FONT_SIZE_SMALL,
        font,
      });

      page1.drawText(fitTextToWidth(font, safeText(row.yearGraduated || ''), FONT_SIZE_SMALL, 35), {
        x: eduMap.yearGraduatedX,
        y,
        size: FONT_SIZE_SMALL,
        font,
      });

      page1.drawText(fitTextToWidth(font, safeText(row.scholarshipAcademicHonors || ''), FONT_SIZE_SMALL, 55), {
        x: eduMap.scholarshipX,
        y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }
  }

  // ==========================================================
  // PAGE 2 — ELIGIBILITY + WORK EXPERIENCE
  // ==========================================================
  const page2 = pages[1];
  const m2 = PDS_PDF_MAP.page2;

  const eligibility: any[] = (pdsData as any).eligibility || [];
  if (Array.isArray(eligibility) && (m2 as any)?.eligibility) {
    const em = (m2 as any).eligibility;

    drawTableRows({
      rows: eligibility,
      startTop: em.startTop,
      rowStep: em.rowStep,
      maxRows: em.maxRows,
      drawRow: (row: any, rowTop: number) => {
        const y = yFromTop(rowTop);

        page2.drawText(fitTextToWidth(font, safeText(row.careerService || ''), FONT_SIZE_SMALL, 170), {
          x: em.careerServiceX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, safeText(row.rating || ''), FONT_SIZE_SMALL, 40), {
          x: em.ratingX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, formatDateForCSC(row.dateOfExaminationConferment), FONT_SIZE_SMALL, 70), {
          x: em.dateOfExamX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, safeText(row.placeOfExaminationConferment || ''), FONT_SIZE_SMALL, 110), {
          x: em.placeOfExamX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, safeText(row.licenseNumber || ''), FONT_SIZE_SMALL, 70), {
          x: em.licenseNumberX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, formatDateForCSC(row.licenseValidity), FONT_SIZE_SMALL, 70), {
          x: em.licenseValidityX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  const work: any[] = (pdsData as any).workExperience || [];
  if (Array.isArray(work) && (m2 as any)?.workExperience) {
    const wm = (m2 as any).workExperience;

    drawTableRows({
      rows: work,
      startTop: wm.startTop,
      rowStep: wm.rowStep,
      maxRows: wm.maxRows,
      drawRow: (row: any, rowTop: number) => {
        const y = yFromTop(rowTop);

        const dateRange = formatDateRangeForCSC(row?.periodOfService?.from, row?.periodOfService?.to);

        page2.drawText(fitTextToWidth(font, dateRange.from, FONT_SIZE_SMALL, 55), {
          x: wm.fromX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, dateRange.to, FONT_SIZE_SMALL, 55), {
          x: wm.toX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });

        page2.drawText(fitTextToWidth(font, safeText(row.positionTitle || ''), FONT_SIZE_SMALL, 150), {
          x: wm.positionTitleX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, safeText(row.departmentAgencyOfficeCompany || ''), FONT_SIZE_SMALL, 170), {
          x: wm.departmentX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });

        if ((wm as any).monthlySalaryX) {
          const sal = row.monthlySalary ? formatSalary(row.monthlySalary) : '';
          page2.drawText(fitTextToWidth(font, sal, FONT_SIZE_SMALL, 80), {
            x: (wm as any).monthlySalaryX,
            y,
            size: FONT_SIZE_SMALL,
            font,
          });
        }
        if ((wm as any).salaryGradeX) {
          page2.drawText(fitTextToWidth(font, safeText(row.salaryGrade || ''), FONT_SIZE_SMALL, 50), {
            x: (wm as any).salaryGradeX,
            y,
            size: FONT_SIZE_SMALL,
            font,
          });
        }

        page2.drawText(fitTextToWidth(font, safeText(row.statusOfAppointment || ''), FONT_SIZE_SMALL, 85), {
          x: wm.statusOfAppointmentX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page2.drawText(fitTextToWidth(font, row.governmentService ? 'Y' : 'N', FONT_SIZE_SMALL, 20), {
          x: wm.govServiceX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  // ==========================================================
  // PAGE 3 — VOLUNTARY + TRAININGS + SKILLS/RECOG/MEMBERSHIPS
  // ==========================================================
  const page3 = pages[2];
  const m3 = PDS_PDF_MAP.page3;

  const voluntary: any[] = (pdsData as any).voluntaryWork || [];
  if (Array.isArray(voluntary) && (m3 as any)?.voluntaryWork) {
    const vm = (m3 as any).voluntaryWork;

    drawTableRows({
      rows: voluntary,
      startTop: vm.startTop,
      rowStep: vm.rowStep,
      maxRows: vm.maxRows,
      drawRow: (row: any, rowTop: number) => {
        const y = yFromTop(rowTop);

        const dateRange = formatDateRangeForCSC(row?.periodOfInvolvement?.from, row?.periodOfInvolvement?.to);

        const orgNameAndAddress = row.organizationAddress
          ? `${row.organizationName} - ${row.organizationAddress}`
          : row.organizationName;

        page3.drawText(fitTextToWidth(font, safeText(orgNameAndAddress || ''), FONT_SIZE_SMALL, 260), {
          x: vm.organizationNameX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, dateRange.from, FONT_SIZE_SMALL, 55), {
          x: vm.fromX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, dateRange.to, FONT_SIZE_SMALL, 55), {
          x: vm.toX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, formatHours(row.numberOfHours), FONT_SIZE_SMALL, 50), {
          x: vm.hoursX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, safeText(row.positionNatureOfWork || ''), FONT_SIZE_SMALL, 140), {
          x: vm.positionX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  const trainings: any[] = (pdsData as any).trainings || [];
  if (Array.isArray(trainings) && (m3 as any)?.trainings) {
    const tm = (m3 as any).trainings;

    drawTableRows({
      rows: trainings,
      startTop: tm.startTop,
      rowStep: tm.rowStep,
      maxRows: tm.maxRows,
      drawRow: (row: any, rowTop: number) => {
        const y = yFromTop(rowTop);

        const dateRange = formatDateRangeForCSC(row?.periodOfAttendance?.from, row?.periodOfAttendance?.to);

        page3.drawText(fitTextToWidth(font, safeText(row.title || ''), FONT_SIZE_SMALL, 250), {
          x: tm.titleX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, dateRange.from, FONT_SIZE_SMALL, 55), {
          x: tm.fromX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, dateRange.to, FONT_SIZE_SMALL, 55), {
          x: tm.toX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, formatHours(row.numberOfHours), FONT_SIZE_SMALL, 50), {
          x: tm.hoursX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, safeText(row.typeOfLD || ''), FONT_SIZE_SMALL, 60), {
          x: tm.typeOfLDX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page3.drawText(fitTextToWidth(font, safeText(row.conductedSponsoredBy || ''), FONT_SIZE_SMALL, 120), {
          x: tm.conductedByX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  const oi3: any = (pdsData as any).otherInformation || {};
  const skills: any[] = oi3.skills || [];
  const recogs: any[] = oi3.recognitions || [];
  const memberships: any[] = oi3.memberships || [];

  if ((m3 as any)?.skills) {
    drawTableRows({
      rows: Array.isArray(skills) ? skills : [],
      startTop: (m3 as any).skills.startTop,
      rowStep: (m3 as any).skills.rowStep,
      maxRows: (m3 as any).skills.maxRows,
      drawRow: (row: any, rowTop: number) => {
        page3.drawText(fitTextToWidth(font, safeText(row), FONT_SIZE_SMALL, 200), {
          x: (m3 as any).skills.x,
          y: yFromTop(rowTop),
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  if ((m3 as any)?.recognitions) {
    drawTableRows({
      rows: Array.isArray(recogs) ? recogs : [],
      startTop: (m3 as any).recognitions.startTop,
      rowStep: (m3 as any).recognitions.rowStep,
      maxRows: (m3 as any).recognitions.maxRows,
      drawRow: (row: any, rowTop: number) => {
        page3.drawText(fitTextToWidth(font, safeText(row), FONT_SIZE_SMALL, 200), {
          x: (m3 as any).recognitions.x,
          y: yFromTop(rowTop),
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  if ((m3 as any)?.memberships) {
    drawTableRows({
      rows: Array.isArray(memberships) ? memberships : [],
      startTop: (m3 as any).memberships.startTop,
      rowStep: (m3 as any).memberships.rowStep,
      maxRows: (m3 as any).memberships.maxRows,
      drawRow: (row: any, rowTop: number) => {
        page3.drawText(fitTextToWidth(font, safeText(row), FONT_SIZE_SMALL, 200), {
          x: (m3 as any).memberships.x,
          y: yFromTop(rowTop),
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  // ==========================================================
  // PAGE 4 — QUESTIONS + REFERENCES + GOV ID + DECLARATION + SIGNATURE
  // ==========================================================
  const page4 = pages[3];
  const m4 = PDS_PDF_MAP.page4;

  const oi: any = (pdsData as any).otherInformation || {};
  const refs: any[] = oi.references || [];
  const gid = oi.governmentIssuedId || {};
  const declaration = oi.declaration || {};

  if ((m4 as any).questions) {
    const drawYesNo = (yesPt: any, noPt: any, isYes: boolean) => {
      if (!drawCheckboxes) return;
      drawCheckbox(page4, font, yesPt.x, yesPt.y, !!isYes);
      drawCheckbox(page4, font, noPt.x, noPt.y, !isYes);
    };

    if ((m4 as any).questions.q34a_yes) {
      drawYesNo((m4 as any).questions.q34a_yes, (m4 as any).questions.q34a_no, !!oi.relatedThirdDegree);
      page4.drawText(fitTextToWidth(font, safeText(oi.relatedThirdDegreeDetails || ''), FONT_SIZE_SMALL, 240), {
        x: (m4 as any).questions.q34a_details.x,
        y: (m4 as any).questions.q34a_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q34b_yes) {
      drawYesNo((m4 as any).questions.q34b_yes, (m4 as any).questions.q34b_no, !!oi.relatedFourthDegree);
      page4.drawText(fitTextToWidth(font, safeText(oi.relatedFourthDegreeDetails || ''), FONT_SIZE_SMALL, 240), {
        x: (m4 as any).questions.q34b_details.x,
        y: (m4 as any).questions.q34b_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q35a_yes) {
      drawYesNo((m4 as any).questions.q35a_yes, (m4 as any).questions.q35a_no, !!oi.guiltyAdministrativeOffense);
      page4.drawText(fitTextToWidth(font, safeText(oi.guiltyAdministrativeOffenseDetails || ''), FONT_SIZE_SMALL, 240), {
        x: (m4 as any).questions.q35a_details.x,
        y: (m4 as any).questions.q35a_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q35b_yes) {
      drawYesNo((m4 as any).questions.q35b_yes, (m4 as any).questions.q35b_no, !!oi.criminallyCharged);
      page4.drawText(fitTextToWidth(font, safeText(oi.criminallyChargedDetails || ''), FONT_SIZE_SMALL, 240), {
        x: (m4 as any).questions.q35b_details.x,
        y: (m4 as any).questions.q35b_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
      page4.drawText(fitTextToWidth(font, formatDateForCSC(oi.criminallyChargedDateFiled), FONT_SIZE_SMALL, 90), {
        x: (m4 as any).questions.q35b_dateFiled.x,
        y: (m4 as any).questions.q35b_dateFiled.y,
        size: FONT_SIZE_SMALL,
        font,
      });
      page4.drawText(fitTextToWidth(font, safeText(oi.criminallyChargedStatus || ''), FONT_SIZE_SMALL, 90), {
        x: (m4 as any).questions.q35b_status.x,
        y: (m4 as any).questions.q35b_status.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q36_yes) {
      drawYesNo((m4 as any).questions.q36_yes, (m4 as any).questions.q36_no, !!oi.convicted);
      page4.drawText(fitTextToWidth(font, safeText(oi.convictedDetails || ''), FONT_SIZE_SMALL, 240), {
        x: (m4 as any).questions.q36_details.x,
        y: (m4 as any).questions.q36_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q37_yes) {
      drawYesNo((m4 as any).questions.q37_yes, (m4 as any).questions.q37_no, !!oi.separatedFromService);
      page4.drawText(fitTextToWidth(font, safeText(oi.separatedFromServiceDetails || ''), FONT_SIZE_SMALL, 240), {
        x: (m4 as any).questions.q37_details.x,
        y: (m4 as any).questions.q37_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q38a_yes) {
      drawYesNo((m4 as any).questions.q38a_yes, (m4 as any).questions.q38a_no, !!oi.candidateNationalLocal);
      page4.drawText(fitTextToWidth(font, safeText(oi.candidateNationalLocalDetails || ''), FONT_SIZE_SMALL, 120), {
        x: (m4 as any).questions.q38a_details.x,
        y: (m4 as any).questions.q38a_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q38b_yes) {
      drawYesNo((m4 as any).questions.q38b_yes, (m4 as any).questions.q38b_no, !!oi.resignedForCandidacy);
      page4.drawText(fitTextToWidth(font, safeText(oi.resignedForCandidacyDetails || ''), FONT_SIZE_SMALL, 120), {
        x: (m4 as any).questions.q38b_details.x,
        y: (m4 as any).questions.q38b_details.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q39_yes) {
      drawYesNo((m4 as any).questions.q39_yes, (m4 as any).questions.q39_no, !!oi.immigrantOrPermanentResident);
      page4.drawText(fitTextToWidth(font, safeText(oi.immigrantOrPermanentResidentCountry || ''), FONT_SIZE_SMALL, 180), {
        x: (m4 as any).questions.q39_country.x,
        y: (m4 as any).questions.q39_country.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q40a_yes) {
      drawYesNo((m4 as any).questions.q40a_yes, (m4 as any).questions.q40a_no, !!oi.indigenousGroupMember);
      page4.drawText(fitTextToWidth(font, safeText(oi.indigenousGroupName || ''), FONT_SIZE_SMALL, 90), {
        x: (m4 as any).questions.q40a_group.x,
        y: (m4 as any).questions.q40a_group.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q40b_yes) {
      drawYesNo((m4 as any).questions.q40b_yes, (m4 as any).questions.q40b_no, !!oi.personWithDisability);
      page4.drawText(fitTextToWidth(font, safeText(oi.pwdIdNumber || ''), FONT_SIZE_SMALL, 90), {
        x: (m4 as any).questions.q40b_id.x,
        y: (m4 as any).questions.q40b_id.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }

    if ((m4 as any).questions.q40c_yes) {
      drawYesNo((m4 as any).questions.q40c_yes, (m4 as any).questions.q40c_no, !!oi.soloParent);
      page4.drawText(fitTextToWidth(font, safeText(oi.soloParentIdNumber || ''), FONT_SIZE_SMALL, 90), {
        x: (m4 as any).questions.q40c_id.x,
        y: (m4 as any).questions.q40c_id.y,
        size: FONT_SIZE_SMALL,
        font,
      });
    }
  }

  // References
  if ((m4 as any).references && Array.isArray(refs)) {
    drawTableRows({
      rows: refs,
      startTop: (m4 as any).references.startTop,
      rowStep: (m4 as any).references.rowStep,
      maxRows: (m4 as any).references.maxRows,
      drawRow: (row: any, rowTop: number) => {
        const y = yFromTop(rowTop);
        page4.drawText(fitTextToWidth(font, safeText(row.name || ''), FONT_SIZE_SMALL, 180), {
          x: (m4 as any).references.nameX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page4.drawText(fitTextToWidth(font, safeText(row.address || ''), FONT_SIZE_SMALL, 240), {
          x: (m4 as any).references.addressX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
        page4.drawText(fitTextToWidth(font, safeText(row.telephoneNo || row.telephone || ''), FONT_SIZE_SMALL, 110), {
          x: (m4 as any).references.telephoneX,
          y,
          size: FONT_SIZE_SMALL,
          font,
        });
      },
    });
  }

  // Government Issued ID
  if (gid && (m4 as any).govIdType) {
    page4.drawText(fitTextToWidth(font, safeText(gid.type || ''), FONT_SIZE, 220), {
      x: (m4 as any).govIdType.x,
      y: (m4 as any).govIdType.y,
      size: FONT_SIZE,
      font,
    });
    page4.drawText(fitTextToWidth(font, safeText(gid.idNumber || ''), FONT_SIZE, 220), {
      x: (m4 as any).govIdNumber.x,
      y: (m4 as any).govIdNumber.y,
      size: FONT_SIZE,
      font,
    });
    page4.drawText(fitTextToWidth(font, formatDateForCSC(gid.dateIssued), FONT_SIZE, 120), {
      x: (m4 as any).govIdDateIssued.x,
      y: (m4 as any).govIdDateIssued.y,
      size: FONT_SIZE,
      font,
    });
  }

  // Declaration date
  const savedDeclDate = declaration?.dateAccomplished;
  const dateToWrite = useCurrentDate ? getCurrentDateCSC() : savedDeclDate || getCurrentDateCSC();
  if ((m4 as any).declarationDateAccomplished) {
    page4.drawText(fitTextToWidth(font, safeText(dateToWrite), FONT_SIZE, 120), {
      x: (m4 as any).declarationDateAccomplished.x,
      y: (m4 as any).declarationDateAccomplished.y,
      size: FONT_SIZE,
      font,
    });
  }

  // Signature embed
  if (includeSignature) {
    const sigDataUrl = declaration?.signatureData;
    if (sigDataUrl && typeof sigDataUrl === 'string' && sigDataUrl.startsWith('data:image')) {
      try {
        const mime = sigDataUrl.substring(5, sigDataUrl.indexOf(';'));
        const base64 = sigDataUrl.split(',')[1];
        const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));

        const img = mime.includes('jpeg') || mime.includes('jpg') ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);

        const box = (m4 as any).signatureBox;
        const imgDims = img.scale(1);

        const pad = 4;
        const maxW = box.w - pad * 2;
        const maxH = box.h - pad * 2;

        const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height);
        const w = imgDims.width * scale;
        const h = imgDims.height * scale;

        const x = box.x + pad + (maxW - w) / 2;
        const y = box.y + pad + (maxH - h) / 2;

        page4.drawImage(img, { x, y, width: w, height: h });
      } catch (e) {
        console.error('Signature embed failed:', e);
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

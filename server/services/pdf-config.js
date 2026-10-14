import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';
export const pdfRoot = path.resolve(config.root, process.env.PDF_IMPORT_DIR || 'storage/pdf-imports');
export const python = process.env.PDF_PYTHON || path.join(config.root, '.venv-pdf', 'bin', 'python');
export const extractor = path.join(config.root, 'server/pdf_import/main.py');
export const maxPdfMb = Math.max(1, Number(process.env.PDF_MAX_UPLOAD_MB) || 512);
export function jobDir(job) { return path.join(pdfRoot, job.storage_key); }
export function outputDir(job) { return path.join(jobDir(job), job.mode); }
export function sourcePath(job) { return path.join(jobDir(job), 'source.pdf'); }
export function ensurePdfRoot() { fs.mkdirSync(pdfRoot,{recursive:true}); }

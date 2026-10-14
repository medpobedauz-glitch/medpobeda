// MedPobeda — public university/program endpoints (for registration dropdowns).
import { Router } from 'express';
import * as universities from '../services/universities.js';

const router = Router();

// GET /api/public/universities — list active universities
router.get('/universities', (req, res) => {
  const lang = ['uz', 'ru', 'en'].includes(req.query.lang) ? req.query.lang : 'uz';
  const list = universities.listUniversities({ status: 'active' });
  res.json({ universities: list.map(u => ({ id: u.id, name: u.name, city: u.city, country: u.country_name, country_code: u.country_code })) });
});

// GET /api/public/programs — list active programs
router.get('/programs', (req, res) => {
  const lang = ['uz', 'ru', 'en'].includes(req.query.lang) ? req.query.lang : 'uz';
  const list = universities.listPrograms({ status: 'active', lang });
  res.json({ programs: list });
});

export default router;

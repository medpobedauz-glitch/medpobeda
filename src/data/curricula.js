// MedPobeda - Curriculum and Subject Data
// This structured data file holds all curriculum and subject information.
// Status: 'sample' = illustrative placeholder, 'confirmed' = verified by university
import { t } from '../i18n/index.js';

export const curriculaData = [
  {
    id: 'medicine',
    icon: 'medicine',
    accentColor: '#1A6BCC',
    status: 'sample',
    subjects: [
      { id: 'anatomy', icon: 'anatomy', status: 'sample' },
      { id: 'physiology', icon: 'physiology', status: 'sample' },
      { id: 'biochemistry', icon: 'biochemistry', status: 'sample' },
      { id: 'histology', icon: 'histology', status: 'sample' },
      { id: 'microbiology', icon: 'microbiology', status: 'sample' },
      { id: 'pharmacology', icon: 'pharmacology', status: 'sample' },
    ],
  },
  {
    id: 'pharmacy',
    icon: 'pharmacy',
    accentColor: '#00B4A6',
    status: 'sample',
    subjects: [
      { id: 'general-chemistry', icon: 'chemistry', status: 'sample' },
      { id: 'organic-chemistry', icon: 'chemistry', status: 'sample' },
      { id: 'biochemistry', icon: 'biochemistry', status: 'sample' },
      { id: 'pharmacology', icon: 'pharmacology', status: 'sample' },
      { id: 'pharmacognosy', icon: 'pharmacognosy', status: 'sample' },
      { id: 'pharmaceutical-chemistry', icon: 'pharmaceutical', status: 'sample' },
    ],
  },
  {
    id: 'dentistry',
    icon: 'dentistry',
    accentColor: '#9B59B6',
    status: 'sample',
    subjects: [
      { id: 'anatomy', icon: 'anatomy', status: 'sample' },
      { id: 'physiology', icon: 'physiology', status: 'sample' },
      { id: 'biochemistry', icon: 'biochemistry', status: 'sample' },
      { id: 'histology', icon: 'histology', status: 'sample' },
      { id: 'microbiology', icon: 'microbiology', status: 'sample' },
      { id: 'dental-anatomy', icon: 'dental', status: 'sample' },
    ],
  },
];

// Subject ID -> i18n key suffix. Displayed names live ONLY in src/i18n/*.js
// (single translation system): t('subject.<key>.name'), t('subject.<key>.desc').
const subjectKeyMap = {
  'anatomy': 'anatomy',
  'physiology': 'physiology',
  'biochemistry': 'biochemistry',
  'histology': 'histology',
  'microbiology': 'microbiology',
  'pharmacology': 'pharmacology',
  'general-chemistry': 'generalchem',
  'organic-chemistry': 'organicchem',
  'pharmacognosy': 'pharmacognosy',
  'pharmaceutical-chemistry': 'pharmchem',
  'dental-anatomy': 'dentalanatomy',
};

// Sample categories used by the Subjects page filters.
export const subjectCategories = {
  'anatomy': 'fundamental',
  'physiology': 'fundamental',
  'biochemistry': 'fundamental',
  'histology': 'fundamental',
  'microbiology': 'fundamental',
  'pharmacology': 'applied',
  'general-chemistry': 'fundamental',
  'organic-chemistry': 'fundamental',
  'pharmacognosy': 'applied',
  'pharmaceutical-chemistry': 'applied',
  'dental-anatomy': 'applied',
};

export function getSubjectKey(subjectId) {
  return subjectKeyMap[subjectId] || null;
}

export function getCurriculumById(id) {
  return curriculaData.find(c => c.id === id) || null;
}

export function getSubjectName(subjectId) {
  const key = subjectKeyMap[subjectId];
  return key ? t('subject.' + key + '.name') : subjectId;
}

export function getSubjectDescription(subjectId) {
  const key = subjectKeyMap[subjectId];
  return key ? t('subject.' + key + '.desc') : '';
}

export function getCurriculaCount() {
  return curriculaData.length;
}

export function getSubjectsForCurriculum(curriculumId) {
  const curriculum = getCurriculumById(curriculumId);
  return curriculum ? curriculum.subjects : [];
}
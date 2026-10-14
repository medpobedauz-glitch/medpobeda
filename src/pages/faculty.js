// MedPobeda - Faculty Directory Page (teacher profiles)
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

export function renderFaculty() {
  const teachers = [
    { name: 'Dr. Sarah Johnson', spec: 'Human Anatomy', exp: '12 years', initials: 'SJ' },
    { name: 'Dr. Michael Chen', spec: 'Pharmacology', exp: '8 years', initials: 'MC' },
    { name: 'Dr. Emily Davis', spec: 'Biochemistry', exp: '10 years', initials: 'ED' },
    { name: 'Dr. James Wilson', spec: 'Microbiology', exp: '14 years', initials: 'JW' },
    { name: 'Dr. Maria Garcia', spec: 'Pathology', exp: '11 years', initials: 'MG' },
    { name: 'Dr. Alex Smith', spec: 'Medical Sciences', exp: '15 years', initials: 'AS' },
  ];

  const rows = teachers.map((teacher) =>
    '<article class="fcard">' +
    '<div class="fcard__photo" aria-hidden="true">' + teacher.initials + '</div>' +
    '<div class="fcard__body">' +
    '<h3 class="fcard__name">' + teacher.name + '</h3>' +
    '<dl class="fcard__meta">' +
    '<div class="fcard__row"><dt>Specialization</dt><dd>' + teacher.spec + '</dd></div>' +
    '<div class="fcard__row"><dt>Experience</dt><dd>' + teacher.exp + '</dd></div>' +
    '</dl>' +
    '</div></article>'
  ).join('');

  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.faculty', titleKey: 'facultypage.title', ledeKey: 'facultypage.lede' }) +
    '<section class="section"><div class="container">' +
    '<div class="faculty-grid">' + rows + '</div>' +
    '</div></section>';
  return { titleKey: 'facultypage.title', descKey: 'meta.faculty', activePage: 'faculty', bodyHtml: body, init: null };
}

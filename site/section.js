/**
 * section.js — entry point for the knowledge-section shells. The shell's <body data-type data-page>
 * says which section and which page to render, so every section shares one external script and the
 * site can run under a strict Content-Security-Policy with no inline code. `index` and `detail` are the
 * generic hub and entity pages (site/entity.js); the taxonomy pages of the clinical layer
 * (test categories, one test category, the medication class taxonomy) live in site/taxonomy.js.
 */
import { renderIndex, renderDetail } from './entity.js?v=1.7.0';
import { renderTestCategories, renderTestCategory, renderMedicationClasses } from './taxonomy.js?v=1.7.0';
const { type, page } = document.body.dataset;
const PAGES = { 'test-categories': renderTestCategories, 'test-category': renderTestCategory, 'medication-classes': renderMedicationClasses };
(PAGES[page] || (page === 'detail' ? renderDetail : renderIndex))(type);

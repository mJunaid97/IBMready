/**
 * section.js — entry point for the knowledge-section shells. The shell's <body data-type data-page>
 * says which section and which page (index or detail) to render, so every section shares one
 * external script and the site can run under a strict Content-Security-Policy with no inline code.
 */
import { renderIndex, renderDetail } from './entity.js?v=1.2.0';
const { type, page } = document.body.dataset;
(page === 'detail' ? renderDetail : renderIndex)(type);

// site/notfound.js — page script for 404.html: draws the shared header and footer.
import { renderHeader, renderFooter } from './site.js?v=1.1.2';
renderHeader('none'); renderFooter();
document.body.dataset.rendered = '1';

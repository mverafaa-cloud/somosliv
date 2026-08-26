import { createRequire } from 'module';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
import fs from 'fs';

const G = '#0B7A3B';                 // verde LIV del pendón
const LOGO = 'data:image/png;base64,' + fs.readFileSync('/home/claude/LIV/public/assets/logo-mark.png').toString('base64');

// QR vectorial (extraigo el <path> y su viewBox)
const qrsvg = fs.readFileSync('/home/claude/LIV/banner/qr.svg', 'utf8');
const qrPath = qrsvg.match(/<path d="([^"]+)"/)[1];

const W = 2172, H = 724;

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size: ${W}px ${H}px; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; }
  body { position:relative; background:#ffffff; font-family:'Anton',sans-serif; overflow:hidden; }
  /* franjas diagonales arriba y abajo */
  .band { position:absolute; left:0; width:100%; height:74px;
    background:repeating-linear-gradient(300deg, ${G} 0 20px, #ffffff 20px 44px); }
  .band.top { top:0; } .band.bot { bottom:0; }
  .frame { position:absolute; inset:20px; border:0; }
  /* logo */
  .logo { position:absolute; left:70px; top:50%; transform:translateY(-50%); height:520px; }
  /* texto central */
  .center { position:absolute; left:640px; top:50%; transform:translateY(-50%);
    color:${G}; line-height:.9; font-style:italic; text-transform:uppercase; letter-spacing:-1px; }
  .l1 { font-size:150px; }
  .l2 { font-size:250px; margin-top:6px; }
  /* bloque derecho */
  .right { position:absolute; right:70px; top:50%; transform:translateY(-50%);
    display:flex; flex-direction:column; align-items:center; gap:26px; }
  .divider { position:absolute; right:560px; top:130px; bottom:130px; width:5px; background:${G}; border-radius:3px; }
  .pill { background:${G}; color:#fff; font-family:'Anton',sans-serif; font-size:46px;
    letter-spacing:1px; padding:12px 34px; border-radius:40px; white-space:nowrap; }
  .qrrow { display:flex; align-items:center; gap:34px; }
  .qr { width:210px; height:210px; }
  .ig { width:120px; height:120px; }
</style></head>
<body>
  <div class="band top"></div>
  <div class="band bot"></div>
  <img class="logo" src="${LOGO}">
  <div class="center">
    <div class="l1">LA LIGA DE LA</div>
    <div class="l2">IV REGIÓN</div>
  </div>
  <div class="divider"></div>
  <div class="right">
    <div class="pill">WWW.SOMOSLIV.CL</div>
    <div class="qrrow">
      <svg class="qr" viewBox="0 0 25 25" fill="${G}" xmlns="http://www.w3.org/2000/svg"><path d="${qrPath}"/></svg>
      <svg class="ig" viewBox="0 0 24 24" fill="none" stroke="${G}" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1.4" fill="${G}" stroke="none"/></svg>
    </div>
  </div>
</body></html>`;

fs.writeFileSync('/home/claude/LIV/banner/banner.html', html);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// PDF vectorial (texto real, escalable)
const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await pg.setContent(html, { waitUntil: 'networkidle' });
await pg.pdf({ path: '/home/claude/LIV/banner/Pendon-LIV-IV-Region.pdf', width: `${W}px`, height: `${H}px`, printBackground: true, pageRanges: '1' });
// PNG gigante para imprimir (3x = 6516x2172)
const pg2 = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3 });
await pg2.setContent(html, { waitUntil: 'networkidle' });
await pg2.screenshot({ path: '/home/claude/LIV/banner/Pendon-LIV-IV-Region.png', clip: { x:0, y:0, width:W, height:H } });
await b.close();
console.log('OK banner PDF + PNG');

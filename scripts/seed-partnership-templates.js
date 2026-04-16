/**
 * seed-partnership-templates.js  — v2
 * 3 variants Partnership Agreement (bilingual ID/EN)
 * Variant A: Foreign company / Foreign director  — no KTP, no NIB/NPWP
 * Variant B: Indonesian company / Foreign director — NIB+NPWP, no KTP
 * Variant C: Indonesian company / Indonesian director — KTP + NIB + NPWP (no notary/AHU)
 * Director fields come from contacts table (date_of_birth, place_of_birth, id_type, id_number, nationality)
 */
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CSS = `<style>
@page{size:A4;margin:22mm 18mm}
body{font-family:'Times New Roman',serif;font-size:10.5px;color:#1a1918;line-height:1.6;margin:0}
.hdr{text-align:center;border-bottom:2px solid #1a1918;padding-bottom:10px;margin-bottom:14px}
.hdr h1{font-size:13px;font-weight:bold;margin:0 0 3px;text-transform:uppercase;letter-spacing:.8px}
.hdr p{font-size:9.5px;color:#555;margin:2px 0}
table.bi{width:100%;border-collapse:collapse;margin:6px 0}
table.bi td{vertical-align:top;padding:4px 6px;font-size:10.5px}
table.bi td.L{width:50%;border-right:1px solid #d1d5db;padding-right:10px}
table.bi td.R{width:50%;padding-left:10px}
.art{margin:12px 0 4px;border-top:1px solid #ccc;padding-top:6px}
.art-ttl{font-weight:bold;text-align:center;font-size:10.5px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.party{background:#f9f8f7;border:1px solid #e5e7eb;border-radius:3px;padding:8px 10px;margin:5px 0;font-size:10px}
.f{color:#1a5fa8}
table.sig{width:100%;border-collapse:collapse;margin-top:28px}
table.sig td{width:50%;text-align:center;padding:0 14px;vertical-align:bottom}
.sig-img{max-height:50px;max-width:140px;object-fit:contain;display:block;margin:0 auto 4px}
.sig-line{border-bottom:1px solid #1a1918;margin-bottom:4px}
.sig-lbl{font-size:9.5px;color:#555;line-height:1.5}
.annex-hdr{margin-top:32px;border-top:3px double #1a1918;padding-top:12px;text-align:center}
</style>`

// Variant-specific party block builder
function partyBlock(variant, side, vars) {
  // side: 'sponsor' | 'company'
  const isIndo = (variant === 'C') || (variant === 'B' && side === 'company')
  const isSponsor = side === 'sponsor'
  const prefix = isSponsor ? 'sponsor' : 'company'
  const partyNum = isSponsor ? '1' : '2'
  const partyIdID = isSponsor ? 'Pihak Pertama' : 'Pihak Kedua'
  const partyIdEN = isSponsor ? 'First Party' : 'Second Party'
  const idLabelID = isIndo ? 'KTP' : 'Paspor'
  const idLabelEN = isIndo ? 'KTP (Resident Identity Card)' : 'Passport'
  const nibBlock = isIndo
    ? `NIB: <span class="f">{{${prefix}_nib}}</span> &bull; NPWP: <span class="f">{{${prefix}_npwp}}</span><br>`
    : ''

  const idID = `<strong>${partyNum}.</strong> <span class="f">{{${prefix}_director_name}}</span>, lahir di <span class="f">{{${prefix}_director_dob_place}}</span>, pada tanggal <span class="f">{{${prefix}_director_dob}}</span>, Warga Negara <span class="f">{{${prefix}_director_nationality}}</span>, Pemegang ${idLabelID} nomor <span class="f">{{${prefix}_director_id_number}}</span>;<br><br>
Bertindak selaku Direktur mewakili direksi, untuk dan atas nama <strong><span class="f">{{${prefix}_name}}</span></strong> (<span class="f">{{${prefix}_legal_type}}</span>), berkedudukan di <span class="f">{{${prefix}_city}}</span>, Indonesia. ${nibBlock}<em>(Selanjutnya disebut sebagai <strong>${partyIdID}</strong>).</em>`

  const idEN = `<strong>${partyNum}.</strong> <span class="f">{{${prefix}_director_name}}</span>, born in <span class="f">{{${prefix}_director_dob_place}}</span> on <span class="f">{{${prefix}_director_dob}}</span>, <span class="f">{{${prefix}_director_nationality}}</span> citizen, holder of ${idLabelEN} number <span class="f">{{${prefix}_director_id_number}}</span>;<br><br>
Acting as Director representing the Board of Directors, for and on behalf of <strong><span class="f">{{${prefix}_name}}</span></strong> (<span class="f">{{${prefix}_legal_type}}</span>), domiciled in <span class="f">{{${prefix}_city}}</span>, Indonesia. ${nibBlock}<em>(hereinafter referred to as the <strong>${partyIdEN}</strong>).</em>`

  return `<div class="party"><table class="bi"><tr><td class="L">${idID}</td><td class="R">${idEN}</td></tr></table></div>`
}

function buildTemplate(variant) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${CSS}</head><body>
<div class="hdr">
<h1>PERJANJIAN KERJA SAMA / PARTNERSHIP AGREEMENT</h1>
<p>Dibuat dan ditandatangani pada / Made and signed on: <strong class="f">{{agreement_date}}</strong></p>
<p style="font-size:9px;color:#999">${variant==='A'?'Variant A — Foreign Company / Foreign Director':variant==='B'?'Variant B — Indonesian Company / Foreign Director':'Variant C — Indonesian Company / Indonesian Director'}</p>
</div>

<table class="bi" style="margin-bottom:6px"><tr>
<td class="L"><strong>Para Pihak yang mengadakan Perjanjian ini adalah:</strong></td>
<td class="R"><strong>The Parties entering into this Agreement are:</strong></td>
</tr></table>

${partyBlock(variant, 'sponsor', {})}
${partyBlock(variant, 'company', {})}

<div class="art"><div class="art-ttl">Pendahuluan / Introduction</div>
<table class="bi"><tr>
<td class="L">1. Bahwa Pihak Pertama adalah suatu badan hukum yang bergerak di bidang penyediaan layanan penjaminan visa dan/atau fasilitasi program magang internasional, yang memiliki kapasitas dan kewenangan untuk bertindak sebagai penjamin (sponsor) visa bagi peserta magang sesuai dengan ketentuan peraturan perundang-undangan yang berlaku;<br><br>
2. Bahwa Pihak Kedua adalah suatu badan hukum yang menjalankan kegiatan usaha di bidangnya dan bersedia untuk menerima peserta magang di lingkungan perusahaan, dengan tetap memperhatikan ketentuan hukum, standar keselamatan kerja, serta etika profesional yang berlaku;<br><br>
3. Bahwa oleh karena ketentuan di atas, Para Pihak sepakat untuk mengatur hak dan kewajiban masing-masing terkait penjaminan visa, pelaksanaan program magang, dan pembagian tanggung jawab sebagaimana diatur dalam Perjanjian ini.</td>
<td class="R">1. That First Party is a legal entity engaged in the provision of visa sponsorship services and/or the facilitation of international internship programs, having the capacity and authority to act as a visa sponsor for interns in accordance with applicable laws and regulations;<br><br>
2. That Second Party is a legal entity conducting business activities in its respective field and is willing to accept interns within its business environment, while observing applicable laws, occupational safety standards, and professional ethics;<br><br>
3. That due to the above, the Parties agree to regulate their respective rights and obligations regarding visa sponsorship, the implementation of the internship program, and the allocation of responsibilities as further set out in this Agreement.</td>
</tr></table></div>

<div class="art"><div class="art-ttl">Pasal 1 — Maksud dan Tujuan / Article 1 — Purpose</div>
<table class="bi"><tr>
<td class="L">Tujuan Perjanjian ini adalah memformalkan kerja sama antara Sponsor dan Perusahaan Penerima terkait penerimaan seorang Peserta Magang, dengan Sponsor sebagai penjamin visa. Identitas lengkap Peserta Magang tercantum dalam Lampiran I (Surat Perintah Kerja) yang merupakan bagian tidak terpisahkan dari Perjanjian ini.</td>
<td class="R">The purpose of this Agreement is to formalize the collaboration between the Sponsor and the Host Company for the reception of an Intern under the Sponsor's visa sponsorship. The Intern's full identity and mission are set out in Annex I (Mission Letter) which forms an integral part of this Agreement.</td>
</tr></table></div>

<div class="art"><div class="art-ttl">Pasal 2 — Hak dan Kewajiban / Article 2 — Rights and Obligations</div>
<table class="bi"><tr>
<td class="L">Selama berlakunya Perjanjian ini:<br>
1. Pihak Pertama wajib menjamin, mengurus, dan memastikan visa bagi peserta magang sesuai ketentuan keimigrasian yang berlaku;<br>
2. Pihak Pertama wajib menyimpan dan mengelola dokumen penjaminan visa;<br>
3. Pihak Pertama wajib membuat perjanjian terpisah dengan peserta magang mengenai tanggung jawab pribadi, biaya, dan kewajiban hukum;<br>
4. Pihak Pertama berhak menerima informasi dari Pihak Kedua apabila terjadi pelanggaran serius, masalah kesehatan, atau persoalan keimigrasian;<br>
5. Pihak Kedua wajib menyediakan tempat magang yang layak bagi peserta magang;<br>
6. Pihak Kedua wajib menunjuk pembimbing yang mengawasi kegiatan peserta magang;<br>
7. Pihak Kedua wajib menjamin lingkungan kerja yang aman dan profesional;<br>
8. Pihak Kedua wajib memberitahu Pihak Pertama apabila terjadi pelanggaran serius, masalah kesehatan, atau persoalan keimigrasian;<br>
9. Pihak Kedua berhak menentukan aturan internal dan mengambil tindakan yang diperlukan terhadap peserta magang.</td>
<td class="R">During the term of this Agreement:<br>
1. First Party shall guarantee, process, and ensure the issuance of the visa for the intern in accordance with applicable immigration regulations;<br>
2. First Party shall store and manage all documents relating to visa sponsorship;<br>
3. First Party shall enter into a separate agreement with the intern regarding personal responsibilities, expenses, and legal obligations;<br>
4. First Party shall be entitled to receive information from Second Party in the event of any serious violation, health issue, or immigration matter;<br>
5. Second Party shall provide a proper internship placement within the company's environment;<br>
6. Second Party shall appoint a supervisor to oversee the intern's activities;<br>
7. Second Party shall ensure a safe and professional working environment;<br>
8. Second Party shall notify First Party in the event of any serious violation, health issue, or immigration or legal matter;<br>
9. Second Party shall be entitled to establish internal rules and take necessary measures in respect of the intern.</td>
</tr></table></div>

<div class="art"><div class="art-ttl">Pasal 3 — Pernyataan dan Jaminan / Article 3 — Representations and Warranties</div>
<table class="bi"><tr>
<td class="L">1. Perawatan kesehatan, perjalanan, akomodasi, asuransi, serta setiap kewajiban finansial maupun hukum yang timbul dari peserta magang merupakan tanggung jawab peserta magang semata;<br>
2. Setiap kerusakan, denda, repatriasi, atau biaya medis akibat tindakan peserta magang sepenuhnya menjadi tanggung jawab peserta magang;<br>
3. Para Pihak tidak memikul tanggung jawab bersama maupun masing-masing atas hal-hal tersebut;<br>
4. Perjanjian terpisah akan ditandatangani antara Pihak Pertama dan peserta magang untuk memformalkan pembagian tanggung jawab dimaksud.</td>
<td class="R">1. Health care, travel, accommodation, insurance, and any financial or legal obligations incurred by the intern shall be the sole responsibility of the intern;<br>
2. Any damage, fines, repatriation costs, or medical expenses arising from the intern's actions shall be entirely the responsibility of the intern;<br>
3. The Parties shall not bear any joint or several liability in respect of the foregoing matters;<br>
4. A separate agreement shall be executed between First Party and the intern to formalize the allocation of such responsibilities.</td>
</tr></table></div>

<div class="art"><div class="art-ttl">Pasal 4 — Jangka Waktu / Article 4 — Duration</div>
<table class="bi"><tr>
<td class="L">1. Perjanjian ini mulai berlaku pada tanggal ditandatanganinya oleh Para Pihak dan tetap berlaku selama jangka waktu magang sebagaimana tercantum dalam Lampiran I, kecuali diakhiri lebih awal berdasarkan kesepakatan bersama;<br>
2. Perjanjian dapat diperpanjang berdasarkan kesepakatan tertulis Para Pihak.</td>
<td class="R">1. This Agreement shall take effect on the date of signature by the Parties and remain valid for the duration of the internship as stated in Annex I, unless terminated earlier by mutual consent;<br>
2. The Agreement may be extended based on a written agreement by the Parties.</td>
</tr></table></div>

<div class="art"><div class="art-ttl">Pasal 5 — Penyelesaian Sengketa / Article 5 — Dispute Resolution</div>
<table class="bi"><tr>
<td class="L">Segala perselisihan akan diselesaikan terlebih dahulu secara musyawarah. Apabila dalam 30 (tiga puluh) hari kalender tidak tercapai penyelesaian, Para Pihak sepakat untuk menyelesaikan sengketa melalui Pengadilan Negeri Denpasar.</td>
<td class="R">Any disputes shall first be resolved through deliberation. If within 30 (thirty) calendar days a resolution cannot be reached, the Parties agree to settle the dispute through the Denpasar District Court.</td>
</tr></table></div>

<div class="art"><div class="art-ttl">Pasal 6 — Ketentuan Umum / Article 6 — General Provisions</div>
<table class="bi"><tr>
<td class="L">Setiap perubahan terhadap Perjanjian ini harus dilakukan secara tertulis dan ditandatangani Para Pihak. Apabila ada ketentuan yang tidak sah, ketentuan lainnya tetap berlaku. Perjanjian ini dibuat dalam bahasa Indonesia dan bahasa Inggris; apabila terjadi perbedaan penafsiran, versi bahasa Indonesia yang berlaku.</td>
<td class="R">Any amendment to this Agreement must be made in writing and signed by the Parties. If any provision is found invalid, the remaining provisions shall continue in force. This Agreement is executed in Indonesian and English; in the event of any discrepancy, the Indonesian version shall prevail.</td>
</tr></table></div>

<table class="bi" style="margin:20px 0 6px"><tr>
<td class="L" style="text-align:center;font-style:italic">Dibuat dalam 2 (dua) rangkap asli bermeterai cukup, masing-masing memiliki kekuatan hukum yang sama.</td>
<td class="R" style="text-align:center;font-style:italic">Drawn up in 2 (two) original copies with sufficient stamp duty, each having equal legal force.</td>
</tr></table>

<table class="sig"><tr>
<td>
<div class="sig-lbl"><strong>PIHAK PERTAMA / FIRST PARTY</strong><br><span class="f">{{sponsor_name}}</span></div>
<div class="sig-line"></div>
<div class="sig-lbl"><span class="f">{{sponsor_director_name}}</span><br>Direktur Utama / Main Director</div>
</td>
<td>
<div class="sig-lbl"><strong>PIHAK KEDUA / SECOND PARTY</strong><br><span class="f">{{company_name}}</span></div>
<div class="sig-line"></div>
<div class="sig-lbl"><span class="f">{{company_director_name}}</span><br>Direktur / Director</div>
</td>
</tr></table>

<!-- ═══════════════ ANNEX I — MISSION LETTER ═══════════════ -->
<div class="annex-hdr">
<h2 style="font-size:11.5px;font-weight:bold;text-transform:uppercase;margin:0 0 3px">LAMPIRAN I / ANNEX I — MISSION LETTER</h2>
<p style="font-size:9px;color:#777;margin:0">Merupakan bagian tidak terpisahkan dari Perjanjian di atas / Forms an integral part of the Partnership Agreement above</p>
</div>

<table class="bi" style="margin-top:12px"><tr>
<td class="L">
<strong>Intern / Peserta Magang:</strong><br>
Nama / Name: <strong class="f">{{intern_full_name}}</strong><br>
Kewarganegaraan / Nationality: <span class="f">{{intern_nationality}}</span><br>
No. Paspor / Passport No.: <span class="f">{{intern_passport}}</span><br><br>
<strong>Penempatan / Placement:</strong><br>
Jabatan / Position: <span class="f">{{job_title}}</span><br>
Periode / Period: <span class="f">{{start_date}}</span> — <span class="f">{{end_date}}</span> (<span class="f">{{duration_months}}</span> months)<br>
Lokasi / Location: <span class="f">{{job_location}}</span><br><br>
<strong>Uraian Tugas / Missions:</strong><br>
{{missions_html}}
</td>
<td class="R">
<p>The intern named herein is placed by <strong>{{sponsor_name}}</strong> (First Party / Pihak Pertama) at <strong>{{company_name}}</strong> (Second Party / Pihak Kedua) for the internship period indicated.</p>
<p>The missions listed constitute the agreed scope of activities for this placement. All terms of the Partnership Agreement above apply in full to this mission.</p>
<p style="margin-top:16px;font-size:9.5px;color:#555">This Annex is signed simultaneously with the main Agreement and has the same legal force.</p>
</td>
</tr></table>

<table class="sig" style="margin-top:16px"><tr>
<td>
<div class="sig-line"></div>
<div class="sig-lbl">Pihak Pertama / First Party<br><span class="f">{{sponsor_name}}</span></div>
</td>
<td>
<div class="sig-line"></div>
<div class="sig-lbl">Pihak Kedua / Second Party<br><span class="f">{{company_name}}</span></div>
</td>
</tr></table>

</body></html>`
}

// Variables per variant
const VARS = {
  common: ['agreement_date','intern_full_name','intern_nationality','intern_passport','job_title','start_date','end_date','duration_months','job_location','job_description','missions_html','sponsor_name','sponsor_legal_type','sponsor_city','sponsor_address','sponsor_director_name','sponsor_director_nationality','sponsor_director_dob','sponsor_director_dob_place','sponsor_director_id_number'],
  A: [],
  B: ['company_nib','company_npwp'],
  C: ['sponsor_nib','sponsor_npwp','company_nib','company_npwp','company_director_id_number'],
}
const compCommon = ['company_name','company_legal_type','company_city','company_address','company_director_name','company_director_nationality','company_director_dob','company_director_dob_place']

const TEMPLATES = [
  { name:'Partnership Agreement — Foreign Company / Foreign Director', type:'partnership_agreement', language:'bilingual', subtype:'A', vars:[...VARS.common,...compCommon,...VARS.A] },
  { name:'Partnership Agreement — Indonesian Company / Foreign Director', type:'partnership_agreement', language:'bilingual', subtype:'B', vars:[...VARS.common,...compCommon,...VARS.B] },
  { name:'Partnership Agreement — Indonesian Company / Indonesian Director', type:'partnership_agreement', language:'bilingual', subtype:'C', vars:[...VARS.common,...compCommon,...VARS.C] },
]

async function main() {
  for (const t of TEMPLATES) {
    const html = buildTemplate(t.subtype)
    const { data: existing } = await s.from('contract_templates').select('id').eq('name', t.name).limit(1)
    if (existing?.length) {
      const r = await s.from('contract_templates').update({ html_content: html, variables_detected: t.vars, version: 2 }).eq('id', existing[0].id)
      console.log(r.error ? `❌ ${t.subtype}: ${r.error.message}` : `✅ Updated v2: ${t.name}`)
    } else {
      const r = await s.from('contract_templates').insert({ name: t.name, type: t.type, language: t.language, html_content: html, variables_detected: t.vars, is_active: true, version: 2 })
      console.log(r.error ? `❌ ${t.subtype}: ${r.error.message}` : `✅ Inserted: ${t.name}`)
    }
  }
  console.log('✅ Done.')
}
main().catch(console.error)

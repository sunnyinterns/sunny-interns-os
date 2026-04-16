/**
 * seed-partnership-templates.ts
 * Génère et insère les 3 templates Partnership Agreement + Mission Letter
 * Usage: node seed-partnership-templates.js (depuis ~/sunny-interns-os)
 */
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CSS = `
<style>
@page{size:A4;margin:22mm 18mm}
body{font-family:'Times New Roman',serif;font-size:10.5px;color:#1a1918;line-height:1.55;margin:0}
.hdr{text-align:center;border-bottom:2px solid #1a1918;padding-bottom:10px;margin-bottom:14px}
.hdr h1{font-size:12.5px;font-weight:bold;margin:0 0 3px;text-transform:uppercase;letter-spacing:.8px}
.hdr p{font-size:9.5px;color:#555;margin:2px 0}
table.bi{width:100%;border-collapse:collapse;margin:6px 0}
table.bi td{vertical-align:top;padding:3px 6px;font-size:10.5px}
table.bi td.left{width:50%;border-right:1px solid #d1d5db;padding-right:10px}
table.bi td.right{width:50%;padding-left:10px}
.art{margin:12px 0 6px;border-top:1px solid #ccc;padding-top:6px}
.art-ttl{font-weight:bold;text-align:center;font-size:11px;margin-bottom:4px}
.party{background:#f9f8f7;border:1px solid #e5e7eb;border-radius:3px;padding:7px 9px;margin:5px 0;font-size:10px}
.f{color:#1a5fa8}
.sig-area{margin-top:28px}
table.sig{width:100%;border-collapse:collapse}
table.sig td{width:50%;text-align:center;padding:0 12px;vertical-align:bottom}
.sig-img{max-height:50px;max-width:140px;object-fit:contain;display:block;margin:0 auto 3px}
.sig-line{border-bottom:1px solid #1a1918;margin-bottom:4px}
.sig-lbl{font-size:9.5px;color:#555;line-height:1.4}
.annex-hdr{margin-top:30px;border-top:3px double #1a1918;padding-top:12px;text-align:center}
</style>`

// Director ID section per template variant
const DIRECTOR_ID = {
  A: { // Foreign company + Foreign director
    id_label_id: 'Paspor', id_label_en: 'Passport',
    sponsor_extra_id: '', company_extra_id: ''
  },
  B: { // Indonesian company + Foreign director
    id_label_id: 'Paspor', id_label_en: 'Passport',
    sponsor_extra_id: '', company_extra_id: `NIB: <span class="f">{{company_nib}}</span> &bull; NPWP: <span class="f">{{company_npwp}}</span><br>`
  },
  C: { // Indonesian company + Indonesian director
    id_label_id: 'KTP', id_label_en: 'KTP (Resident Identity Card)',
    sponsor_extra_id: `NIB: <span class="f">{{sponsor_nib}}</span> &bull; NPWP: <span class="f">{{sponsor_npwp}}</span><br>`,
    company_extra_id: `NIB: <span class="f">{{company_nib}}</span> &bull; NPWP: <span class="f">{{company_npwp}}</span><br>`
  }
}

function buildTemplate(variant) {
  const v = DIRECTOR_ID[variant]
  const notaryClause = variant === 'C'
    ? `Akta Pendirian Nomor <span class="f">{{sponsor_deed_number}}</span>, tanggal <span class="f">{{sponsor_deed_date}}</span>, dibuat di hadapan <span class="f">{{sponsor_notary_name}}</span>, yang telah mendapatkan pengesahan berdasarkan Keputusan Menteri Hukum dan HAM RI Nomor <span class="f">{{sponsor_ahu_number}}</span>, tanggal <span class="f">{{sponsor_ahu_date}}</span>;`
    : `Registration/Deed No. <span class="f">{{sponsor_deed_number}}</span> dated <span class="f">{{sponsor_deed_date}}</span>;`
  const notaryClauseEn = variant === 'C'
    ? `Deed of Establishment No. <span class="f">{{sponsor_deed_number}}</span> dated <span class="f">{{sponsor_deed_date}}</span> before <span class="f">{{sponsor_notary_name}}</span>, approved by the Ministry of Law and Human Rights of the Republic of Indonesia under Decision No. <span class="f">{{sponsor_ahu_number}}</span> dated <span class="f">{{sponsor_ahu_date}}</span>;`
    : `Registration/Deed No. <span class="f">{{sponsor_deed_number}}</span> dated <span class="f">{{sponsor_deed_date}}</span>;`
  const companyNotaryId = variant === 'C'
    ? `Akta Pendirian Nomor <span class="f">{{company_deed_number}}</span>, tanggal <span class="f">{{company_deed_date}}</span>, dibuat di hadapan <span class="f">{{company_notary_name}}</span>, yang telah mendapatkan pengesahan berdasarkan Keputusan Menteri Hukum dan HAM RI Nomor <span class="f">{{company_ahu_number}}</span>, tanggal <span class="f">{{company_ahu_date}}</span>;`
    : `Registration/Deed No. <span class="f">{{company_deed_number}}</span> dated <span class="f">{{company_deed_date}}</span>;`
  const companyNotaryIdEn = variant === 'C'
    ? `Deed of Establishment No. <span class="f">{{company_deed_number}}</span> dated <span class="f">{{company_deed_date}}</span> before <span class="f">{{company_notary_name}}</span>, approved by the Ministry of Law and Human Rights No. <span class="f">{{company_ahu_number}}</span> dated <span class="f">{{company_ahu_date}}</span>;`
    : `Registration/Deed No. <span class="f">{{company_deed_number}}</span> dated <span class="f">{{company_deed_date}}</span>;`

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${CSS}</head><body>

<div class="hdr">
<h1>PERJANJIAN KERJA SAMA / PARTNERSHIP AGREEMENT</h1>
<p>Dibuat dan ditandatangani pada / Made and signed on: <strong class="f">{{agreement_date}}</strong></p>
<p style="font-size:9px;color:#888">Variant ${variant}: ${variant==='A'?'Foreign Company / Foreign Director':variant==='B'?'Indonesian Company / Foreign Director':'Indonesian Company / Indonesian Director'}</p>
</div>

<table class="bi"><tr>
<td class="left"><strong>Para Pihak yang mengadakan Perjanjian ini adalah:</strong></td>
<td class="right"><strong>The Parties entering into this Agreement are:</strong></td>
</tr></table>

<!-- PARTY 1: SPONSOR -->
<div class="party">
<table class="bi"><tr>
<td class="left"><strong>1.</strong> <span class="f">{{sponsor_director_name}}</span>, lahir di <span class="f">{{sponsor_director_dob_place}}</span>, pada tanggal <span class="f">{{sponsor_director_dob}}</span>, Warga Negara <span class="f">{{sponsor_director_nationality}}</span>, bertempat tinggal di <span class="f">{{sponsor_address}}</span>, Pemegang ${v.id_label_id} nomor <span class="f">{{sponsor_director_id_number}}</span>;<br><br>
Bertindak selaku Direktur mewakili direksi, untuk dan atas nama <strong><span class="f">{{sponsor_name}}</span></strong> (<span class="f">{{sponsor_legal_type}}</span>), berkedudukan di <span class="f">{{sponsor_city}}</span>, ${v.sponsor_extra_id}${notaryClause}<br>
<em>(Selanjutnya disebut sebagai <strong>Pihak Pertama</strong>).</em></td>
<td class="right"><strong>1.</strong> <span class="f">{{sponsor_director_name}}</span>, born in <span class="f">{{sponsor_director_dob_place}}</span> on <span class="f">{{sponsor_director_dob}}</span>, <span class="f">{{sponsor_director_nationality}}</span> citizen, residing at <span class="f">{{sponsor_address}}</span>, holder of ${v.id_label_en} number <span class="f">{{sponsor_director_id_number}}</span>;<br><br>
Acting as Director representing the Board of Directors, for and on behalf of <strong><span class="f">{{sponsor_name}}</span></strong> (<span class="f">{{sponsor_legal_type}}</span>), domiciled in <span class="f">{{sponsor_city}}</span>, ${v.sponsor_extra_id}${notaryClauseEn}<br>
<em>(hereinafter referred to as the <strong>First Party</strong>).</em></td>
</tr></table>
</div>

<!-- PARTY 2: HOST COMPANY -->
<div class="party">
<table class="bi"><tr>
<td class="left"><strong>2.</strong> <span class="f">{{company_director_name}}</span>, lahir di <span class="f">{{company_director_dob_place}}</span>, pada tanggal <span class="f">{{company_director_dob}}</span>, Warga Negara <span class="f">{{company_director_nationality}}</span>, bertempat tinggal di <span class="f">{{company_address}}</span>, Pemegang ${v.id_label_id} nomor <span class="f">{{company_director_id_number}}</span>;<br><br>
Bertindak selaku Direktur mewakili direksi, untuk dan atas nama <strong><span class="f">{{company_name}}</span></strong> (<span class="f">{{company_legal_type}}</span>), berkedudukan di <span class="f">{{company_city}}</span>, ${v.company_extra_id}${companyNotaryId}<br>
<em>(Selanjutnya disebut sebagai <strong>Pihak Kedua</strong>).</em></td>
<td class="right"><strong>2.</strong> <span class="f">{{company_director_name}}</span>, born in <span class="f">{{company_director_dob_place}}</span> on <span class="f">{{company_director_dob}}</span>, <span class="f">{{company_director_nationality}}</span> citizen, residing at <span class="f">{{company_address}}</span>, holder of ${v.id_label_en} number <span class="f">{{company_director_id_number}}</span>;<br><br>
Acting as Director representing the Board of Directors, for and on behalf of <strong><span class="f">{{company_name}}</span></strong> (<span class="f">{{company_legal_type}}</span>), domiciled in <span class="f">{{company_city}}</span>, ${v.company_extra_id}${companyNotaryIdEn}<br>
<em>(hereinafter referred to as the <strong>Second Party</strong>).</em></td>
</tr></table>
</div>

<!-- PENDAHULUAN -->
<div class="art"><div class="art-ttl">PENDAHULUAN / INTRODUCTION</div>
<table class="bi"><tr>
<td class="left">1. Bahwa Pihak Pertama adalah suatu badan hukum yang bergerak di bidang penyediaan layanan penjaminan visa dan/atau fasilitasi program magang internasional, yang memiliki kapasitas dan kewenangan untuk bertindak sebagai penjamin (sponsor) visa bagi peserta magang sesuai dengan ketentuan peraturan perundang-undangan yang berlaku;</td>
<td class="right">1. That First Party is a legal entity engaged in the provision of visa sponsorship services and/or the facilitation of international internship programs, having the capacity and authority to act as a visa sponsor for interns in accordance with the applicable laws and regulations;</td>
</tr><tr>
<td class="left">2. Bahwa Pihak Kedua adalah suatu badan hukum yang menjalankan kegiatan usaha di bidangnya masing-masing dan bersedia untuk menerima peserta magang guna melaksanakan kegiatan magang di lingkungan perusahaan, dengan tetap memperhatikan ketentuan hukum, standar keselamatan kerja, serta etika profesional yang berlaku;</td>
<td class="right">2. That Second Party is a legal entity conducting business activities in its respective field and is willing to accept interns to carry out internship activities within its business environment, while observing the applicable laws, occupational safety standards, and professional ethics;</td>
</tr><tr>
<td class="left">3. Bahwa oleh karena ketentuan di atas, Para Pihak sepakat untuk mengatur hak dan kewajiban masing-masing, termasuk namun tidak terbatas pada penjaminan visa, pelaksanaan program magang, pembagian tanggung jawab, serta pembebasan tanggung jawab tertentu terkait tindakan dan kewajiban pribadi peserta magang, sebagaimana diatur dalam Perjanjian ini.</td>
<td class="right">3. That due to the above provisions, the Parties agree to regulate their respective rights and obligations, including but not limited to visa sponsorship, the implementation of the internship program, the allocation of responsibilities, as well as the limitation of certain liabilities related to the acts and personal obligations of the intern, as further set out in this Agreement.</td>
</tr></table></div>

<!-- PASAL 1 -->
<div class="art"><div class="art-ttl">PASAL 1 — MAKSUD DAN TUJUAN / ARTICLE 1 — PURPOSE AND OBJECTIVE</div>
<table class="bi"><tr>
<td class="left">Tujuan Perjanjian ini adalah untuk memformalkan kerja sama antara Sponsor dan Perusahaan Penerima terkait penerimaan seorang peserta magang (<strong>Peserta Magang</strong>) di lingkungan Perusahaan Penerima di Indonesia, dengan Sponsor sebagai penjamin visa peserta magang tersebut. Identitas lengkap Peserta Magang tercantum dalam Lampiran I (Surat Perintah Kerja) yang merupakan bagian tidak terpisahkan dari Perjanjian ini.</td>
<td class="right">The purpose of this Agreement is to formalize the collaboration between the Sponsor and the Host Company for the reception of an intern (<strong>The Intern</strong>) under the visa sponsorship of the Sponsor, within the premises of the Host Company in Indonesia. The full identity and mission of the Intern are set out in Annex I (Mission Letter) which forms an integral part of this Agreement.</td>
</tr></table></div>

<!-- PASAL 2 -->
<div class="art"><div class="art-ttl">PASAL 2 — HAK DAN KEWAJIBAN / ARTICLE 2 — RIGHTS AND OBLIGATIONS</div>
<table class="bi"><tr>
<td class="left">Selama berlakunya Perjanjian ini:<br>
1. Pihak Pertama wajib menjamin, mengurus dan memastikan visa bagi peserta magang selama periode magang sesuai dengan ketentuan keimigrasian yang berlaku;<br>
2. Pihak Pertama wajib menyimpan dan mengelola dokumen yang berkaitan dengan penjaminan visa peserta magang;<br>
3. Pihak Pertama wajib memberikan informasi administrasi yang diperlukan terkait status visa peserta magang kepada Pihak Kedua apabila diperlukan;<br>
4. Pihak Pertama wajib membuat dan menandatangani perjanjian terpisah dengan peserta magang mengenai pembagian tanggung jawab, khususnya terkait biaya pribadi, perilaku, dan kewajiban hukum peserta magang;<br>
5. Pihak Pertama berhak untuk menerima informasi dari perusahaan penerima apabila terjadi pelanggaran serius, masalah kesehatan, atau persoalan keimigrasian yang melibatkan peserta magang;<br>
6. Pihak Kedua wajib menyediakan tempat magang yang layak bagi peserta magang di lingkungan perusahaan;<br>
7. Pihak Kedua wajib menunjuk pembimbing yang akan mendampingi dan mengawasi kegiatan peserta magang selama periode magang;<br>
8. Pihak Kedua wajib menjamin lingkungan kerja yang aman dan profesional, termasuk mematuhi standar dasar keselamatan dan etika kerja;<br>
9. Pihak Kedua wajib memberitahu kepada Pihak Pertama apabila terjadi pelanggaran serius, masalah kesehatan serius, dan persoalan keimigrasian atau hukum yang melibatkan peserta magang;<br>
10. Pihak Kedua berhak untuk mendapatkan peserta magang, menentukan aturan internal kepada peserta magang serta mengambil tindakan jika diperlukan untuk peserta magang.</td>
<td class="right">During the term of this Agreement:<br>
1. First Party shall guarantee, process, and ensure the issuance of the visa for the intern for the duration of the internship period in accordance with the applicable immigration regulations;<br>
2. First Party shall store and manage all documents relating to the sponsorship of the intern's visa;<br>
3. First Party shall provide any administrative information required in relation to the intern's visa status to Second Party, if and when necessary;<br>
4. First Party shall prepare and enter into a separate agreement with the intern regarding the allocation of responsibilities, particularly with respect to the intern's personal expenses, conduct, and legal obligations;<br>
5. First Party shall be entitled to receive information from the Host Company in the event of any serious violation, health issue, or immigration-related matter involving the intern;<br>
6. Second Party shall provide a proper and adequate internship placement for the intern within the company's environment;<br>
7. Second Party shall appoint a supervisor who will accompany and oversee the intern's activities throughout the internship period;<br>
8. Second Party shall ensure a safe and professional working environment, including compliance with basic safety standards and codes of conduct;<br>
9. Second Party shall notify the First Party in the event of any serious violation, serious health issue, or immigration or legal matter involving the intern;<br>
10. Second Party shall be entitled to receive interns, to establish internal rules applicable to the intern, and to take necessary measures or actions in respect of the intern, where required.</td>
</tr></table></div>

<!-- PASAL 3 -->
<div class="art"><div class="art-ttl">PASAL 3 — PERNYATAAN DAN JAMINAN / ARTICLE 3 — REPRESENTATIONS AND WARRANTIES</div>
<table class="bi"><tr>
<td class="left">1. Perawatan kesehatan, perjalanan, akomodasi, asuransi, serta setiap kewajiban finansial maupun hukum yang timbul oleh peserta magang merupakan tanggung jawab peserta magang semata;<br>
2. Setiap kerusakan, denda, repatriasi, pemulangan, atau biaya medis yang timbul sebagai akibat dari tindakan peserta magang sepenuhnya menjadi tanggung jawab peserta magang;<br>
3. Para Pihak tidak memikul tanggung jawab secara bersama-sama maupun masing-masing atas hal-hal tersebut;<br>
4. Suatu perjanjian terpisah akan ditandatangani secara langsung antara Pihak Pertama dan peserta magang untuk memformalkan pembagian tanggung jawab dimaksud.</td>
<td class="right">1. Health care, travel, accommodation, insurance, as well as any financial or legal obligations incurred by the intern shall be the sole responsibility of the intern;<br>
2. Any damage, fines, repatriation or return costs, or medical expenses arising as a result of the intern's actions shall be entirely the responsibility of the intern;<br>
3. Parties shall not bear any joint or several liability whatsoever in respect of the foregoing matters;<br>
4. A separate agreement shall be executed directly between the First Party and the intern in order to formalize the allocation of such responsibilities.</td>
</tr></table></div>

<!-- PASAL 4 -->
<div class="art"><div class="art-ttl">PASAL 4 — JANGKA WAKTU / ARTICLE 4 — TIME PERIOD</div>
<table class="bi"><tr>
<td class="left">1. Perjanjian ini mulai berlaku pada tanggal ditandatanganinya oleh Para Pihak dan tetap berlaku selama jangka waktu magang sebagaimana tercantum dalam Lampiran I, kecuali diakhiri lebih awal berdasarkan kesepakatan bersama Para Pihak;<br>
2. Perjanjian dapat diperpanjang berdasarkan kesepakatan tertulis oleh Para Pihak.</td>
<td class="right">1. This Agreement shall take effect on the date of signature by the Parties and remain valid for the duration of the internship as stated in Annex I, unless terminated earlier by mutual consent;<br>
2. The Agreement may be extended based on a written agreement by the Parties.</td>
</tr></table></div>

<!-- PASAL 5 -->
<div class="art"><div class="art-ttl">PASAL 5 — PENYELESAIAN SENGKETA / ARTICLE 5 — DISPUTE RESOLUTION</div>
<table class="bi"><tr>
<td class="left">1. Segala perselisihan yang timbul antara Para Pihak sehubungan dengan penafsiran dan/atau pelaksanaan perjanjian ini, terlebih dahulu akan diselesaikan secara musyawarah untuk mencapai mufakat;<br>
2. Apabila dalam jangka waktu 30 (tiga puluh) hari kalender sejak tanggal dimulainya perundingan tidak tercapai penyelesaian secara musyawarah, maka Para Pihak dengan ini sepakat untuk menyelesaikan sengketa tersebut melalui Pengadilan Negeri Denpasar.</td>
<td class="right">1. Any disputes arising between the Parties in connection with the interpretation and/or implementation of this Agreement shall first be resolved through deliberation to reach a consensus;<br>
2. If within 30 (thirty) calendar days from the date of commencement of negotiations a resolution cannot be reached, then the Parties hereby agree to settle the dispute through the Denpasar District Court.</td>
</tr></table></div>

<!-- PASAL 6-8 abbreviated -->
<div class="art"><div class="art-ttl">PASAL 6-8 — ADDENDUM, KETERPISAHAN, LAIN-LAIN / ARTICLES 6-8</div>
<table class="bi"><tr>
<td class="left">Setiap perubahan terhadap Perjanjian ini harus dilakukan secara tertulis dan ditandatangani oleh Para Pihak. Apabila ada ketentuan yang dinyatakan tidak sah atau tidak dapat dilaksanakan, ketentuan lainnya tetap berlaku. Perjanjian ini dilaksanakan dalam bahasa Indonesia dan bahasa Inggris; apabila terjadi perbedaan penafsiran, versi bahasa Indonesia yang berlaku.</td>
<td class="right">Any amendment to this Agreement must be made in writing and signed by the Parties. If any provision is found to be invalid or unenforceable, the remaining provisions shall continue in full force. This Agreement is executed in Indonesian and English; in the event of any discrepancy in interpretation, the Indonesian version shall prevail.</td>
</tr></table></div>

<!-- SIGNATURE -->
<div class="sig-area">
<table class="bi" style="margin-bottom:6px"><tr>
<td class="left" style="text-align:center">Dibuat dalam 2 (dua) rangkap asli bermeterai cukup, masing-masing rangkap memiliki kekuatan hukum yang sama.</td>
<td class="right" style="text-align:center">Drawn up in 2 (two) original copies with sufficient stamp duty, each copy has equal legal force.</td>
</tr></table>

<table class="sig">
<tr>
<td>
  <div class="sig-lbl"><strong>PIHAK PERTAMA / FIRST PARTY</strong><br><span class="f">{{sponsor_name}}</span></div>
  {{#if sponsor_signature_url}}<img class="sig-img" src="{{sponsor_signature_url}}" alt="Sponsor signature">{{/if}}
  <div class="sig-line"></div>
  <div class="sig-lbl"><span class="f">{{sponsor_director_name}}</span><br>Direktur / Director</div>
</td>
<td>
  <div class="sig-lbl"><strong>PIHAK KEDUA / SECOND PARTY</strong><br><span class="f">{{company_name}}</span></div>
  <div class="sig-line"></div>
  <div class="sig-lbl"><span class="f">{{company_director_name}}</span><br>Direktur / Director</div>
</td>
</tr>
</table>
</div>

<!-- ANNEX I: MISSION LETTER -->
<div class="annex-hdr">
<h2 style="font-size:12px;font-weight:bold;text-transform:uppercase;margin:0 0 4px">LAMPIRAN I / ANNEX I</h2>
<h3 style="font-size:11px;margin:0 0 2px">SURAT PERINTAH KERJA / MISSION LETTER</h3>
<p style="font-size:9px;color:#777;margin:0">Merupakan bagian tidak terpisahkan dari Perjanjian Kerja Sama di atas / Forms an integral part of the Partnership Agreement above</p>
</div>

<table class="bi" style="margin-top:10px"><tr>
<td class="left">
<strong>Data Peserta Magang / Intern Information:</strong><br><br>
<strong>Nama lengkap / Full name:</strong> <span class="f">{{intern_full_name}}</span><br>
<strong>Kebangsaan / Nationality:</strong> <span class="f">{{intern_nationality}}</span><br>
<strong>Nomor Paspor / Passport No.:</strong> <span class="f">{{intern_passport}}</span><br><br>
<strong>Jabatan / Position:</strong> <span class="f">{{job_title}}</span><br>
<strong>Periode / Period:</strong> <span class="f">{{start_date}}</span> — <span class="f">{{end_date}}</span> (<span class="f">{{duration_months}}</span> bulan / months)<br>
<strong>Lokasi / Location:</strong> <span class="f">{{job_location}}</span><br><br>
<strong>Uraian Tugas / Job Description:</strong><br>
<span class="f">{{job_description}}</span><br><br>
<strong>Misi Utama / Key Missions:</strong><br>
{{missions_html}}
</td>
<td class="right">
The intern named above is placed by <strong>{{sponsor_name}}</strong> (First Party) at <strong>{{company_name}}</strong> (Second Party) for the internship period indicated. The responsibilities and missions listed herein constitute the agreed scope of activities for this internship placement.<br><br>
All terms and conditions of the Partnership Agreement apply in full to this mission.
</td>
</tr></table>

<table class="sig" style="margin-top:20px">
<tr>
<td>
  {{#if sponsor_signature_url}}<img class="sig-img" src="{{sponsor_signature_url}}" alt="Sponsor signature">{{/if}}
  <div class="sig-line"></div>
  <div class="sig-lbl">Pihak Pertama / First Party<br><span class="f">{{sponsor_name}}</span> — <span class="f">{{sponsor_director_name}}</span></div>
</td>
<td>
  <div class="sig-line"></div>
  <div class="sig-lbl">Pihak Kedua / Second Party<br><span class="f">{{company_name}}</span> — <span class="f">{{company_director_name}}</span></div>
</td>
</tr>
</table>

</body></html>`
}

async function main() {
  const templates = [
    {
      name: 'Partnership Agreement — Foreign Company / Foreign Director',
      type: 'partnership_agreement',
      subtype: 'A',
      language: 'bilingual',
      html: buildTemplate('A'),
      vars: ['agreement_date','sponsor_name','sponsor_legal_type','sponsor_registration','sponsor_city','sponsor_address','sponsor_director_name','sponsor_director_nationality','sponsor_director_dob','sponsor_director_dob_place','sponsor_director_id_number','company_name','company_legal_type','company_city','company_address','company_director_name','company_director_nationality','company_director_dob','company_director_dob_place','company_director_id_number','intern_full_name','intern_nationality','intern_passport','job_title','start_date','end_date','duration_months','job_location','job_description','missions_html','sponsor_signature_url']
    },
    {
      name: 'Partnership Agreement — Indonesian Company / Foreign Director',
      type: 'partnership_agreement',
      subtype: 'B',
      language: 'bilingual',
      html: buildTemplate('B'),
      vars: ['agreement_date','sponsor_name','sponsor_legal_type','sponsor_registration','sponsor_city','sponsor_address','sponsor_director_name','sponsor_director_nationality','sponsor_director_dob','sponsor_director_dob_place','sponsor_director_id_number','company_name','company_legal_type','company_nib','company_npwp','company_city','company_address','company_director_name','company_director_nationality','company_director_dob','company_director_dob_place','company_director_id_number','company_deed_number','company_deed_date','company_notary_name','company_ahu_number','company_ahu_date','intern_full_name','intern_nationality','intern_passport','job_title','start_date','end_date','duration_months','job_location','job_description','missions_html','sponsor_signature_url']
    },
    {
      name: 'Partnership Agreement — Indonesian Company / Indonesian Director',
      type: 'partnership_agreement',
      subtype: 'C',
      language: 'bilingual',
      html: buildTemplate('C'),
      vars: ['agreement_date','sponsor_name','sponsor_legal_type','sponsor_registration','sponsor_nib','sponsor_npwp','sponsor_city','sponsor_address','sponsor_director_name','sponsor_director_nationality','sponsor_director_dob','sponsor_director_dob_place','sponsor_director_id_number','sponsor_deed_number','sponsor_deed_date','sponsor_notary_name','sponsor_ahu_number','sponsor_ahu_date','company_name','company_legal_type','company_nib','company_npwp','company_city','company_address','company_director_name','company_director_nationality','company_director_dob','company_director_dob_place','company_director_id_number','company_deed_number','company_deed_date','company_notary_name','company_ahu_number','company_ahu_date','intern_full_name','intern_nationality','intern_passport','job_title','start_date','end_date','duration_months','job_location','job_description','missions_html','sponsor_signature_url']
    }
  ]

  for (const t of templates) {
    // Check existing
    const { data: existing } = await s.from('contract_templates')
      .select('id').eq('name', t.name).limit(1)
    
    if (existing?.length) {
      const r = await s.from('contract_templates')
        .update({ html_content: t.html, variables_detected: t.vars, is_active: true })
        .eq('id', existing[0].id)
      console.log(r.error ? `❌ Update ${t.subtype}: ${r.error.message}` : `✅ Updated: ${t.name}`)
    } else {
      const r = await s.from('contract_templates').insert({
        name: t.name, type: t.type, language: t.language,
        html_content: t.html, variables_detected: t.vars, is_active: true, version: 1
      })
      console.log(r.error ? `❌ Insert ${t.subtype}: ${r.error.message}` : `✅ Inserted: ${t.name}`)
    }
  }
  console.log('Done.')
}

main().catch(console.error)

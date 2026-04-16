/**
 * update-mission-letter.js
 * Met à jour l'annexe Mission Letter dans les 3 templates Partnership Agreement
 */
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TEMPLATE_IDS = [
  '25ac4ac0-4f9a-487e-9c08-0546de0c389c', // Variant A
  'f13936c2-8c4a-4a7e-9504-b434a62ba63b', // Variant B
  'e4dc2c5f-b4d1-422f-a528-a60fa2355039', // Variant C
]

const NEW_ANNEX = `
<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- LAMPIRAN I / ANNEX I — SURAT PERINTAH KERJA / MISSION LETTER  -->
<!-- ═══════════════════════════════════════════════════════════════ -->

<div style="margin-top:32px;border-top:3px double #1a1918;padding-top:14px;text-align:center">
  <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px">
    LAMPIRAN I / ANNEX I — SURAT PERINTAH KERJA / MISSION LETTER
  </div>
  <div style="font-size:9.5px;color:#777;font-style:italic">
    Merupakan bagian tidak terpisahkan dari Perjanjian di atas /
    Forms an integral part of the Partnership Agreement above
  </div>
</div>

<!-- Data Peserta Magang / Intern Information -->
<table class="bi" style="margin-top:14px;border-top:1px solid #e5e7eb">
  <!-- Section header -->
  <tr>
    <td class="left" style="padding-bottom:4px">
      <strong style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555">
        Data Peserta Magang
      </strong>
    </td>
    <td class="right" style="padding-bottom:4px">
      <strong style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555">
        Intern Information
      </strong>
    </td>
  </tr>

  <!-- Nama / Name -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db">
      <span style="color:#777;font-size:10px">Nama</span><br>
      <strong class="f">{{intern_full_name}}</strong>
    </td>
    <td class="right" style="padding:4px 0 4px 10px">
      <span style="color:#777;font-size:10px">Name</span><br>
      <strong class="f">{{intern_full_name}}</strong>
    </td>
  </tr>

  <!-- Kewarganegaraan / Nationality -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db">
      <span style="color:#777;font-size:10px">Kewarganegaraan</span><br>
      <span class="f">{{intern_nationality}}</span>
    </td>
    <td class="right" style="padding:4px 0 4px 10px">
      <span style="color:#777;font-size:10px">Nationality</span><br>
      <span class="f">{{intern_nationality}}</span>
    </td>
  </tr>

  <!-- No. Paspor / Passport No. -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db">
      <span style="color:#777;font-size:10px">No. Paspor</span><br>
      <span class="f" style="font-family:monospace">{{intern_passport}}</span>
    </td>
    <td class="right" style="padding:4px 0 4px 10px">
      <span style="color:#777;font-size:10px">Passport No.</span><br>
      <span class="f" style="font-family:monospace">{{intern_passport}}</span>
    </td>
  </tr>

  <!-- Spacer -->
  <tr><td colspan="2" style="padding:6px 0"><div style="border-top:1px solid #f0f0f0"></div></td></tr>

  <!-- Section header Penempatan -->
  <tr>
    <td class="left" style="padding-bottom:4px">
      <strong style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555">
        Penempatan
      </strong>
    </td>
    <td class="right" style="padding-bottom:4px">
      <strong style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#555">
        Placement
      </strong>
    </td>
  </tr>

  <!-- Jabatan / Position -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db">
      <span style="color:#777;font-size:10px">Jabatan</span><br>
      <strong class="f">{{job_title}}</strong>
    </td>
    <td class="right" style="padding:4px 0 4px 10px">
      <span style="color:#777;font-size:10px">Position</span><br>
      <strong class="f">{{job_title}}</strong>
    </td>
  </tr>

  <!-- Periode / Period -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db">
      <span style="color:#777;font-size:10px">Periode</span><br>
      <span class="f">{{start_date}}</span> — <span class="f">{{end_date}}</span>
      (<span class="f">{{duration_months}}</span> bulan)
    </td>
    <td class="right" style="padding:4px 0 4px 10px">
      <span style="color:#777;font-size:10px">Period</span><br>
      <span class="f">{{start_date}}</span> — <span class="f">{{end_date}}</span>
      (<span class="f">{{duration_months}}</span> months)
    </td>
  </tr>

  <!-- Lokasi / Location -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db">
      <span style="color:#777;font-size:10px">Lokasi</span><br>
      <span class="f">{{job_location}}</span>
    </td>
    <td class="right" style="padding:4px 0 4px 10px">
      <span style="color:#777;font-size:10px">Location</span><br>
      <span class="f">{{job_location}}</span>
    </td>
  </tr>

  <!-- Spacer -->
  <tr><td colspan="2" style="padding:6px 0"><div style="border-top:1px solid #f0f0f0"></div></td></tr>

  <!-- Uraian Tugas / Missions -->
  <tr>
    <td class="left" style="padding:4px 6px 4px 0;border-right:1px solid #d1d5db;vertical-align:top">
      <span style="color:#777;font-size:10px">Uraian Tugas</span><br>
      <div class="f" style="margin-top:3px">{{missions_html}}</div>
    </td>
    <td class="right" style="padding:4px 0 4px 10px;vertical-align:top">
      <span style="color:#777;font-size:10px">Missions</span><br>
      <div class="f" style="margin-top:3px">{{missions_html}}</div>
    </td>
  </tr>
</table>

<!-- Paragraph bilingue -->
<table class="bi" style="margin-top:12px;background:#f9f8f7;border:1px solid #e5e7eb;border-radius:4px">
  <tr>
    <td class="left" style="padding:8px 10px;font-size:10px;border-right:1px solid #d1d5db">
      Peserta magang yang disebutkan di atas ditempatkan oleh
      <strong>{{sponsor_name}}</strong> (Pihak Pertama) di
      <strong>{{company_name}}</strong> (Pihak Kedua) untuk periode magang yang tercantum di atas.
      Tugas-tugas yang tercantum merupakan ruang lingkup kegiatan yang disepakati untuk penempatan ini.
      Semua ketentuan Perjanjian Kerja Sama di atas berlaku sepenuhnya untuk penugasan ini.
      Lampiran ini ditandatangani bersamaan dengan Perjanjian utama dan memiliki kekuatan hukum yang sama.
    </td>
    <td class="right" style="padding:8px 10px;font-size:10px">
      The intern named herein is placed by
      <strong>{{sponsor_name}}</strong> (First Party / Pihak Pertama) at
      <strong>{{company_name}}</strong> (Second Party / Pihak Kedua) for the internship period indicated above.
      The missions listed constitute the agreed scope of activities for this placement.
      All terms of the Partnership Agreement above apply in full to this mission.
      This Annex is signed simultaneously with the main Agreement and has the same legal force.
    </td>
  </tr>
</table>

<!-- Signatures Annex -->
<table class="sig" style="margin-top:22px">
  <tr>
    <td>
      {{#if sponsor_signature_url}}<img class="sig-img" src="{{sponsor_signature_url}}" alt="Sponsor signature">{{/if}}
      <div class="sig-line"></div>
      <div class="sig-lbl">
        Pihak Pertama / First Party<br>
        <strong>{{sponsor_name}}</strong><br>
        {{sponsor_director_name}}<br>
        <em>Direktur Utama / Main Director</em>
      </div>
    </td>
    <td>
      <div class="sig-line"></div>
      <div class="sig-lbl">
        Pihak Kedua / Second Party<br>
        <strong>{{company_name}}</strong><br>
        {{company_director_name}}<br>
        <em>Direktur / Director</em>
      </div>
    </td>
  </tr>
</table>

</body></html>`

// Marker to find the annex section in existing templates
const ANNEX_START_MARKER = '\n<!-- ANNEX I: MISSION LETTER -->'
const BODY_END = '</body></html>'

async function main() {
  let updated = 0
  for (const id of TEMPLATE_IDS) {
    const { data: tmpl } = await s.from('contract_templates').select('id, name, html_content').eq('id', id).single()
    if (!tmpl?.html_content) { console.log(`⚠️  ${id} — no html_content`); continue }

    // Remove old annex (from annex marker to end, or from annex-hdr to end)
    let html = tmpl.html_content

    // Find where the old annex starts — look for the annex header div or ANNEX I comment
    const markers = [
      '\n<!-- ANNEX I: MISSION LETTER -->',
      '\n<!-- ═══',
      '\n<div class="annex-hdr">',
    ]
    let cutIdx = -1
    for (const m of markers) {
      const idx = html.indexOf(m)
      if (idx !== -1 && (cutIdx === -1 || idx < cutIdx)) cutIdx = idx
    }

    // Keep everything up to the annex, then append new annex
    const base = cutIdx !== -1 ? html.slice(0, cutIdx) : html.replace(BODY_END, '')
    // Ensure base ends before </body></html>
    const cleanBase = base.replace(/<\/body>\s*<\/html>\s*$/, '').trimEnd()

    const newHtml = cleanBase + NEW_ANNEX

    const { error } = await s.from('contract_templates')
      .update({ html_content: newHtml })
      .eq('id', id)

    if (error) {
      console.error(`❌ ${tmpl.name}: ${error.message}`)
    } else {
      console.log(`✅ Updated: ${tmpl.name}`)
      updated++
    }
  }
  console.log(`\nDone — ${updated}/${TEMPLATE_IDS.length} templates updated.`)
}

main().catch(console.error)

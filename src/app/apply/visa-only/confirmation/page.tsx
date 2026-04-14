export default function VisaOnlyConfirmationPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center p-6">
      <div className="max-w-md bg-white border border-zinc-100 rounded-2xl p-8 text-center">
        <p className="text-5xl mb-4">✅</p>
        <h1 className="text-xl font-semibold text-[#1a1918] mb-2">Dossier reçu</h1>
        <p className="text-sm text-zinc-600 mb-4">
          Votre dossier est en cours de traitement. L'équipe Bali Interns reviendra vers vous sous 24-48h.
        </p>
        <p className="text-xs text-zinc-400">
          📧 team@bali-interns.com · 💬 WhatsApp +33 6 43 48 77 36
        </p>
      </div>
    </div>
  )
}

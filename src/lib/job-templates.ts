export type JobTemplate = {
  id: string
  label: string
  icon: string
  department_slug: string
  profile_sought: string
  missions: string[]
  tools: string[]
  required_level: string
  required_languages: string[]
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'community-manager',
    label: 'Community Manager',
    icon: '📱',
    department_slug: 'marketing-communication',
    profile_sought: "Étudiant(e) en marketing digital ou communication, créatif(ve) et à l'aise avec les réseaux sociaux. Autonome, force de proposition.",
    missions: ['Gestion des réseaux sociaux (Instagram, TikTok, Facebook)', 'Création de contenus visuels et vidéo', 'Reporting et analyse des performances'],
    tools: ['Canva', 'CapCut', 'Instagram', 'TikTok', 'Meta Business Suite', 'Notion'],
    required_level: 'Bac+2',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'marketing-digital',
    label: 'Marketing Digital',
    icon: '📊',
    department_slug: 'marketing-communication',
    profile_sought: 'Étudiant(e) en marketing avec des connaissances en SEO/SEA, emailing et analytics. Rigoureux(se) et orienté(e) résultats.',
    missions: ['Gestion des campagnes Google Ads & Meta Ads', 'Optimisation SEO / création de contenu blog', 'Email marketing et CRM'],
    tools: ['Google Ads', 'Google Analytics', 'Meta Ads', 'Mailchimp', 'Semrush', 'Canva'],
    required_level: 'Bac+3',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'graphiste',
    label: 'Designer Graphique',
    icon: '🎨',
    department_slug: 'design-graphisme',
    profile_sought: 'Étudiant(e) en design graphique avec un portfolio solide. Créatif(ve), sens du détail, maîtrise des outils Adobe.',
    missions: ["Création de visuels print et digital", "Refonte de l'identité visuelle", 'Motion design et animations'],
    tools: ['Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'After Effects', 'Canva'],
    required_level: 'Bac+2',
    required_languages: ['fr'],
  },
  {
    id: 'dev-web',
    label: 'Développeur Web',
    icon: '💻',
    department_slug: 'tech-dev',
    profile_sought: 'Étudiant(e) en informatique ou développement web. Curieux(se), autonome, capable de travailler en équipe internationale.',
    missions: ['Développement front-end (React / Next.js)', 'Intégration API et back-end', 'Tests et déploiement'],
    tools: ['React', 'Next.js', 'TypeScript', 'Supabase', 'Vercel', 'GitHub'],
    required_level: 'Bac+3',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'business-dev',
    label: 'Business Developer',
    icon: '🤝',
    department_slug: 'business-dev-sales',
    profile_sought: "Étudiant(e) en école de commerce, ambitieux(se), excellent(e) communicant(e). À l'aise à l'oral et en prospection.",
    missions: ['Prospection et développement du portefeuille clients', 'Négociation et closing', 'Suivi des relations partenaires'],
    tools: ['HubSpot', 'LinkedIn Sales Navigator', 'Notion', 'Google Workspace', 'Pipedrive'],
    required_level: 'Bac+3',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'finance',
    label: 'Finance / Comptabilité',
    icon: '💶',
    department_slug: 'finance-comptabilite',
    profile_sought: 'Étudiant(e) en finance ou comptabilité, rigoureux(se) et analytique. Maîtrise Excel avancée.',
    missions: ['Tenue de la comptabilité courante', 'Rapprochements bancaires et clôtures mensuelles', 'Reporting financier et tableaux de bord'],
    tools: ['Excel', 'Google Sheets', 'QuickBooks', 'Xero', 'Notion'],
    required_level: 'Bac+3',
    required_languages: ['fr'],
  },
]

export const ALL_TOOLS = [
  'Canva', 'CapCut', 'Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'After Effects', 'Premiere Pro',
  'Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Pinterest', 'YouTube',
  'Meta Business Suite', 'Meta Ads', 'Google Ads', 'Google Analytics', 'Google Workspace',
  'SEMrush', 'Mailchimp', 'HubSpot', 'Notion', 'Trello', 'Asana', 'Slack',
  'React', 'Next.js', 'TypeScript', 'Supabase', 'Vercel', 'GitHub', 'WordPress',
  'Excel', 'Google Sheets', 'PowerPoint', 'QuickBooks', 'Xero', 'Pipedrive',
  'ChatGPT', 'Midjourney', 'n8n', 'Make', 'Zapier',
]

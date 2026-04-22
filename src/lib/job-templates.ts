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
    profile_sought: 'Student in digital marketing or communication, creative and comfortable with social media. Autonomous, proactive mindset.',
    missions: [
      'Social media management (Instagram, TikTok, Facebook)',
      'Visual and video content creation',
      'Performance reporting and analytics',
    ],
    tools: ['Canva', 'CapCut', 'Instagram', 'TikTok', 'Meta Business Suite', 'Notion'],
    required_level: 'Bac+2',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'marketing-digital',
    label: 'Digital Marketing',
    icon: '📊',
    department_slug: 'marketing-communication',
    profile_sought: 'Marketing student with knowledge in SEO/SEA, email marketing and analytics. Results-driven and detail-oriented.',
    missions: [
      'Management of Google Ads & Meta Ads campaigns',
      'SEO optimization and blog content creation',
      'Email marketing and CRM management',
    ],
    tools: ['Google Ads', 'Google Analytics', 'Meta Ads', 'Mailchimp', 'Semrush', 'Canva'],
    required_level: 'Bac+3',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'graphic-designer',
    label: 'Graphic Designer',
    icon: '🎨',
    department_slug: 'design-graphisme',
    profile_sought: 'Graphic design student with a strong portfolio. Creative, detail-oriented, proficient with Adobe tools.',
    missions: [
      'Print and digital visual creation',
      'Brand identity redesign',
      'Motion design and animations',
    ],
    tools: ['Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'After Effects', 'Canva'],
    required_level: 'Bac+2',
    required_languages: ['en'],
  },
  {
    id: 'web-developer',
    label: 'Web Developer',
    icon: '💻',
    department_slug: 'tech-dev',
    profile_sought: 'Computer science or web development student. Curious, autonomous, able to work in an international team.',
    missions: [
      'Front-end development (React / Next.js)',
      'API integration and back-end',
      'Testing and deployment',
    ],
    tools: ['React', 'Next.js', 'TypeScript', 'Supabase', 'Vercel', 'GitHub'],
    required_level: 'Bac+3',
    required_languages: ['en'],
  },
  {
    id: 'business-developer',
    label: 'Business Developer',
    icon: '🤝',
    department_slug: 'business-dev-sales',
    profile_sought: 'Business school student, ambitious, excellent communicator. Comfortable with outreach and prospecting.',
    missions: [
      'Client prospecting and portfolio development',
      'Negotiation and closing',
      'Partner relationship management',
    ],
    tools: ['HubSpot', 'LinkedIn Sales Navigator', 'Notion', 'Google Workspace', 'Pipedrive'],
    required_level: 'Bac+3',
    required_languages: ['fr', 'en'],
  },
  {
    id: 'finance',
    label: 'Finance / Accounting',
    icon: '💶',
    department_slug: 'finance-comptabilite',
    profile_sought: 'Finance or accounting student, rigorous and analytical. Advanced Excel skills required.',
    missions: [
      'Day-to-day bookkeeping',
      'Bank reconciliations and monthly closings',
      'Financial reporting and dashboards',
    ],
    tools: ['Excel', 'Google Sheets', 'QuickBooks', 'Xero', 'Notion'],
    required_level: 'Bac+3',
    required_languages: ['en'],
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Guest Experience',
    icon: '🏨',
    department_slug: 'operations',
    profile_sought: 'Hospitality management student with strong interpersonal skills. Fluent in English, passionate about customer experience.',
    missions: [
      'Guest welcome and check-in/check-out management',
      'Coordination with operations and housekeeping teams',
      'Review management and customer satisfaction improvement',
    ],
    tools: ['Opera PMS', 'Booking.com Extranet', 'Google Workspace', 'Notion', 'Airbnb'],
    required_level: 'Bac+2',
    required_languages: ['en'],
  },
  {
    id: 'content-creator',
    label: 'Content Creator',
    icon: '🎬',
    department_slug: 'marketing-communication',
    profile_sought: 'Creative student passionate about video and photo content. Proficient in editing tools, active on social media.',
    missions: [
      'Photo and video production (Reels, TikTok, YouTube Shorts)',
      'Content planning and editorial calendar',
      'Brand storytelling and community engagement',
    ],
    tools: ['CapCut', 'Premiere Pro', 'Lightroom', 'Canva', 'Instagram', 'TikTok'],
    required_level: 'Bac+2',
    required_languages: ['en'],
  },
]

export const ALL_TOOLS = [
  'Canva', 'CapCut', 'Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'After Effects', 'Premiere Pro', 'Lightroom',
  'Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'Pinterest', 'YouTube',
  'Meta Business Suite', 'Meta Ads', 'Google Ads', 'Google Analytics', 'Google Workspace',
  'SEMrush', 'Mailchimp', 'HubSpot', 'Notion', 'Trello', 'Asana', 'Slack',
  'React', 'Next.js', 'TypeScript', 'Supabase', 'Vercel', 'GitHub', 'WordPress',
  'Excel', 'Google Sheets', 'PowerPoint', 'QuickBooks', 'Xero', 'Pipedrive',
  'Opera PMS', 'Booking.com Extranet', 'Airbnb',
  'ChatGPT', 'Midjourney', 'n8n', 'Make', 'Zapier',
]

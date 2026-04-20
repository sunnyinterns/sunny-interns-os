import { Composition, registerRoot } from 'remotion'
import { JobVideoComposition } from './JobVideoComposition'

export const RemotionRoot = () => (
  <>
    <Composition
      id="JobVideo"
      component={JobVideoComposition}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{
        title: 'Stage Marketing Digital',
        company: 'Natural Love Bali',
        location: 'Bali, Indonésie',
        duration: '4 mois',
        hook: 'Tu veux bosser dans un resort 5⭐ à Bali ?',
        perks: ['Logement géré', 'Scooter inclus', 'Équipe internationale'],
        coverImageUrl: undefined,
        logoUrl: undefined,
        brandColor: '#F5A623',
      }}
    />
    <Composition
      id="JobVideoStory"
      component={JobVideoComposition}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        title: 'Stage Marketing Digital',
        company: 'Natural Love Bali',
        location: 'Bali, Indonésie',
        duration: '4 mois',
        hook: 'Tu veux bosser dans un resort 5⭐ à Bali ?',
        perks: ['Logement géré', 'Scooter inclus', 'Équipe internationale'],
        coverImageUrl: undefined,
        logoUrl: undefined,
        brandColor: '#F5A623',
      }}
    />
  </>
)

registerRoot(RemotionRoot)

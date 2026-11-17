import { Hero } from '@/sections/home/Hero'
import { Steps } from '@/sections/home/Steps'
import { Explore } from '@/sections/home/Explore'
import { FinalCta } from '@/sections/home/FinalCta'

export default function Home() {
  return (
    <>
      <Hero />
      <Steps />
      <Explore />
      <FinalCta className="pb-20 md:pb-28" />
    </>
  )
}

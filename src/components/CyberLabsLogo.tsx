import React from 'react'
import { useTheme } from '../contexts/ThemeContext.tsx'

interface CyberLabsLogoProps {
  className?: string
  size?: number
}

const WORDMARK_RATIO = 520 / 160

const CyberLabsLogo: React.FC<CyberLabsLogoProps> = ({ className, size = 40 }) => {
  const width = Math.round(size * WORDMARK_RATIO)
  const { theme } = useTheme()
  const src = theme === 'dark' ? '/cyber-dark.png' : '/cyber-labs-logo-light.svg'
  return (
    <img
      src={src}
      width={width}
      height={size}
      className={className}
      alt="Cyber Labs"
      decoding="async"
    />
  )
}

export default CyberLabsLogo

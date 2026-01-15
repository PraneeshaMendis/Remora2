import React from 'react'

interface CyberLabsLogoProps {
  className?: string
  size?: number
}

const WORDMARK_RATIO = 520 / 160

const CyberLabsLogo: React.FC<CyberLabsLogoProps> = ({ className, size = 40 }) => {
  const width = Math.round(size * WORDMARK_RATIO)
  return (
    <img
      src="/cyber-labs-logo.svg"
      width={width}
      height={size}
      className={className}
      alt="Cyber Labs"
      decoding="async"
    />
  )
}

export default CyberLabsLogo

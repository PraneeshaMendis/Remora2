import React from 'react'

interface RemoraLogoProps {
  className?: string
  size?: number
}

const RemoraLogo: React.FC<RemoraLogoProps> = ({ className, size = 40 }) => {
  return (
    <img
      src="/remora-logo.svg"
      width={size}
      height={size}
      className={className}
      alt="Remora"
      decoding="async"
    />
  )
}

export default RemoraLogo

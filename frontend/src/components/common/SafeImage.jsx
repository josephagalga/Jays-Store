import { useState } from 'react'

/**
 * Image with graceful degradation: if the remote file is dead or blocked,
 * swaps to the local placeholder instead of showing a broken-image icon.
 * referrerPolicy avoids hotlink/referrer-based blocking on CDNs.
 */
export default function SafeImage({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false)
  const finalSrc = !src || failed ? '/placeholder.svg' : src
  return (
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => { if (!failed) setFailed(true) }}
      className={className}
    />
  )
}

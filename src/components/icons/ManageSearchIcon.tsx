import type { SVGProps } from 'react'

/** Icon matching Google Material Symbols "manage_search" — list lines + magnifying glass. */
export function ManageSearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="5" x2="10" y2="5" />
      <line x1="2" y1="12" x2="7" y2="12" />
      <line x1="2" y1="19" x2="7" y2="19" />
      <circle cx="15" cy="11" r="4" />
      <line x1="18.3" y1="14.3" x2="21" y2="17" />
    </svg>
  )
}

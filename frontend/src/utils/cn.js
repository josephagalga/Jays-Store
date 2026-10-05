/** Join class names, dropping falsy values. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default cn

export function labelDotColor(name: string) {
  const palette = [
    "#f9a8d4",
    "#7dd3fc",
    "#86efac",
    "#fcd34d",
    "#c4b5fd",
    "#fda4af",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % palette.length
  }
  return palette[hash]!
}

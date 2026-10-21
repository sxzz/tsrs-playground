import { strFromU8, strToU8, unzlibSync, zlibSync } from 'fflate'

export function utoa(data: string): string {
  const buffer = strToU8(data)
  const zipped = zlibSync(buffer, { level: 9 })
  const binary = strFromU8(zipped, true)
  return btoa(binary)
}

export function atou(base64: string): string {
  const binary = atob(base64)

  return strFromU8(unzlibSync(strToU8(binary, true)))
}

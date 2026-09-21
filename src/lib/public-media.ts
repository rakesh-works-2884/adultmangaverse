/** Only generated public artwork paths; chapter pages never match. */
export function isPublicMediaKey(key: string): boolean {
  return /^(?:manga\/[^/.]+\/(?:cover|hero-desktop|hero-mobile)-[a-z0-9-]+|blog\/[^/.]+\/cover-[a-z0-9-]+|content\/[a-z0-9-]+)\.webp$/.test(key);
}

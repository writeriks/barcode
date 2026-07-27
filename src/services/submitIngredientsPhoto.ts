/**
 * Stub: no submission backend exists yet. Once one does, this is the only
 * place that needs to change — the capture screen doesn't know or care how
 * the photo gets uploaded.
 */
export async function submitIngredientsPhoto(barcode: string, imageUri: string): Promise<void> {
  console.log('[submitIngredientsPhoto] stub submission', { barcode, imageUri });
}

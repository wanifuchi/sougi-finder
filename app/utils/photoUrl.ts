/**
 * 写真URL生成ユーティリティ
 * photoRefsからプロキシ経由の安全なURLを生成
 */

/**
 * photo_referenceからプロキシURLを生成
 * @param photoRef - Google Places APIのphoto_reference
 * @param maxwidth - 最大幅（デフォルト: 800）
 * @returns プロキシAPI経由の写真URL
 */
export function getPhotoUrl(photoRef: string, maxwidth: number = 800): string {
  return `/api/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=${maxwidth}`;
}

/**
 * SearchResultから最初の写真URLを取得
 * photoRefs（セキュア版）を優先し、なければphotoUrl（レガシー）にフォールバック
 */
export function getFirstPhotoUrl(result: { photoRefs?: string[]; photoUrl?: string; photoUrls?: string[] }): string | undefined {
  // 新しいセキュア版を優先
  if (result.photoRefs && result.photoRefs.length > 0) {
    return getPhotoUrl(result.photoRefs[0]);
  }
  // レガシー互換
  if (result.photoUrl) {
    return result.photoUrl;
  }
  if (result.photoUrls && result.photoUrls.length > 0) {
    return result.photoUrls[0];
  }
  return undefined;
}

/**
 * SearchResultから全ての写真URLを取得
 * photoRefs（セキュア版）を優先し、なければphotoUrls（レガシー）にフォールバック
 */
export function getAllPhotoUrls(result: { photoRefs?: string[]; photoUrls?: string[] }): string[] {
  // 新しいセキュア版を優先
  if (result.photoRefs && result.photoRefs.length > 0) {
    return result.photoRefs.map(ref => getPhotoUrl(ref));
  }
  // レガシー互換
  if (result.photoUrls && result.photoUrls.length > 0) {
    return result.photoUrls;
  }
  return [];
}

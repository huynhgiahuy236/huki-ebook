import { Book } from '../../entities';

export function serializeBook(book: Book, includePrivate = false) {
  const digitalDetails = book.digitalDetails
    ? {
        id: book.digitalDetails.id,
        digitalEnabled: book.digitalDetails.digitalEnabled,
        allowOnlineRead: book.digitalDetails.allowOnlineRead,
        allowDownload: book.digitalDetails.allowDownload,
        fileSize: book.digitalDetails.fileSize,
        mimeType: book.digitalDetails.mimeType,
        ...(includePrivate
          ? {
              sourcePdfKey: book.digitalDetails.sourcePdfKey,
              previewPdfKey: book.digitalDetails.previewPdfKey,
              epubKey: book.digitalDetails.epubKey,
              checksum: book.digitalDetails.checksum,
            }
          : {}),
      }
    : null;

  if (includePrivate) return { ...book, digitalDetails };

  const {
    ownerUserId: _ownerUserId,
    coverPublicId: _coverPublicId,
    digitalDetails: _privateDigitalDetails,
    physicalDetails,
    ...publicBook
  } = book;
  const safePhysicalDetails = physicalDetails
    ? {
        physicalEnabled: physicalDetails.physicalEnabled,
        available: physicalDetails.available,
        lowStockThreshold: physicalDetails.lowStockThreshold,
      }
    : null;
  return { ...publicBook, physicalDetails: safePhysicalDetails, digitalDetails };
}

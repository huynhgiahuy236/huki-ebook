import { Book } from '../../entities';
import { serializeBook } from './book-response.util';

describe('serializeBook', () => {
  it('removes ownership, storage keys and reserved inventory from public responses', () => {
    const result = serializeBook(
      {
        ownerUserId: 'private-owner',
        coverPublicId: 'cloudinary-private-id',
        physicalDetails: {
          stock: 10,
          reserved: 3,
          available: 7,
          physicalEnabled: true,
          lowStockThreshold: 2,
        },
        digitalDetails: {
          sourcePdfKey: 'private/source.pdf',
          previewPdfKey: 'private/preview.pdf',
          epubKey: null,
          checksum: 'private-checksum',
          digitalEnabled: true,
          allowOnlineRead: true,
          allowDownload: false,
        },
      } as Book,
      false,
    );

    expect(result).not.toHaveProperty('ownerUserId');
    expect(result).not.toHaveProperty('coverPublicId');
    expect(result.physicalDetails).not.toHaveProperty('reserved');
    expect(result.digitalDetails).not.toHaveProperty('sourcePdfKey');
    expect(result.digitalDetails).not.toHaveProperty('checksum');
  });
});

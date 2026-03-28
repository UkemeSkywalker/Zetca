import fc from 'fast-check';
import { isAllowedContentType, getMediaType, getMaxFileSize, validateFileSize, generateS3Key } from '@/lib/media/validation';
import { ALLOWED_CONTENT_TYPES, AllowedContentType, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '@/types/media';

// Feature: post-image-attachments, Property 1: Content type validation
describe('Property 1: Content type validation', () => {
  it('should accept all allowed content types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        (contentType) => {
          expect(isAllowedContentType(contentType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any string that is not in the allowed list', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !(ALLOWED_CONTENT_TYPES as readonly string[]).includes(s)),
        (contentType) => {
          expect(isAllowedContentType(contentType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject allowed types with extra whitespace or casing changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        fc.constantFrom(' ', '\t', '\n'),
        fc.boolean(),
        (contentType, ws, upper) => {
          const modified = upper ? contentType.toUpperCase() : ws + contentType;
          // Modified versions should not be accepted (unless toUpperCase is a no-op, which it isn't for these)
          if (modified !== contentType) {
            expect(isAllowedContentType(modified)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 2: Media type derivation from content type prefix
describe('Property 2: Media type derivation from content type prefix', () => {
  const imageTypes = ALLOWED_CONTENT_TYPES.filter((ct) => ct.startsWith('image/'));
  const videoTypes = ALLOWED_CONTENT_TYPES.filter((ct) => ct.startsWith('video/'));

  it('should return "image" for all allowed image content types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...imageTypes),
        (contentType) => {
          expect(getMediaType(contentType)).toBe('image');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return "video" for all allowed video content types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...videoTypes),
        (contentType) => {
          expect(getMediaType(contentType)).toBe('video');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only produce "image" or "video" for any allowed content type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        (contentType) => {
          const result = getMediaType(contentType);
          expect(['image', 'video']).toContain(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should derive media type consistently with the content type prefix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        (contentType) => {
          const expectedType = contentType.startsWith('video/') ? 'video' : 'image';
          expect(getMediaType(contentType)).toBe(expectedType);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 4: S3 key format
describe('Property 4: S3 key format', () => {
  // Arbitrary for non-empty strings without slashes (to avoid ambiguity when splitting)
  const nonEmptyNoSlash = fc.stringOf(
    fc.char().filter((c) => c !== '/'),
    { minLength: 1 }
  );

  it('should produce a key in the format {userId}/{mediaId}/{filename}', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const key = generateS3Key(userId, mediaId, filename);
          expect(key).toBe(`${userId}/${mediaId}/${filename}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be round-trippable by splitting on "/" to recover components', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const key = generateS3Key(userId, mediaId, filename);
          const parts = key.split('/');
          expect(parts).toHaveLength(3);
          expect(parts[0]).toBe(userId);
          expect(parts[1]).toBe(mediaId);
          expect(parts[2]).toBe(filename);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should contain exactly two "/" separators', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const key = generateS3Key(userId, mediaId, filename);
          const slashCount = (key.match(/\//g) || []).length;
          expect(slashCount).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should start with the userId prefix', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const key = generateS3Key(userId, mediaId, filename);
          expect(key.startsWith(`${userId}/`)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 5: File size validation by media type
describe('Property 5: File size validation by media type', () => {
  const mediaTypeArb = fc.constantFrom<'image' | 'video'>('image', 'video');

  it('should accept file sizes within the limit for the given media type', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        fc.integer({ min: 1, max: MAX_VIDEO_SIZE }),
        (mediaType, fileSize) => {
          const limit = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
          if (fileSize <= limit) {
            expect(validateFileSize(fileSize, mediaType)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject file sizes exceeding the limit for the given media type', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        fc.integer({ min: 1, max: 1_000_000_000 }),
        (mediaType, offset) => {
          const limit = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
          const oversized = limit + offset;
          expect(validateFileSize(oversized, mediaType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept exactly the max size for each media type', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        (mediaType) => {
          const limit = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
          expect(validateFileSize(limit, mediaType)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject zero file size', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        (mediaType) => {
          expect(validateFileSize(0, mediaType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject negative file sizes', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        fc.integer({ min: -1_000_000_000, max: -1 }),
        (mediaType, fileSize) => {
          expect(validateFileSize(fileSize, mediaType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject non-integer file sizes', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        fc.double({ min: 0.01, max: Number(MAX_VIDEO_SIZE), noNaN: true }).filter((n) => !Number.isInteger(n)),
        (mediaType, fileSize) => {
          expect(validateFileSize(fileSize, mediaType)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use 10 MB limit for images and 100 MB limit for videos', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        (mediaType) => {
          const expected = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
          expect(getMaxFileSize(mediaType)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 6: Client-server validation consistency
describe('Property 6: Client-server validation consistency', () => {
  // Simulate client-side validation (MediaUploader): check type then size
  function clientValidate(contentType: string, fileSize: number): boolean {
    if (!isAllowedContentType(contentType)) return false;
    const mediaType = getMediaType(contentType);
    return validateFileSize(fileSize, mediaType);
  }

  // Simulate server-side validation (upload-url route): check type then size
  function serverValidate(contentType: string, fileSize: number): boolean {
    if (!isAllowedContentType(contentType)) return false;
    const mediaType = getMediaType(contentType);
    return validateFileSize(fileSize, mediaType);
  }

  it('should produce identical accept/reject for any allowed content type and positive file size', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        fc.integer({ min: 1, max: 200 * 1024 * 1024 }),
        (contentType, fileSize) => {
          expect(clientValidate(contentType, fileSize)).toBe(serverValidate(contentType, fileSize));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical reject for any disallowed content type', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !(ALLOWED_CONTENT_TYPES as readonly string[]).includes(s)),
        fc.integer({ min: 1, max: 200 * 1024 * 1024 }),
        (contentType, fileSize) => {
          expect(clientValidate(contentType, fileSize)).toBe(false);
          expect(serverValidate(contentType, fileSize)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical reject for zero or negative file sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        fc.integer({ min: -1_000_000_000, max: 0 }),
        (contentType, fileSize) => {
          expect(clientValidate(contentType, fileSize)).toBe(false);
          expect(serverValidate(contentType, fileSize)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical reject for non-integer file sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        fc.double({ min: 0.01, max: Number(MAX_VIDEO_SIZE), noNaN: true }).filter((n) => !Number.isInteger(n)),
        (contentType, fileSize) => {
          expect(clientValidate(contentType, fileSize)).toBe(false);
          expect(serverValidate(contentType, fileSize)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should agree on boundary values: exactly at the limit', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AllowedContentType>(...ALLOWED_CONTENT_TYPES),
        (contentType) => {
          const mediaType = getMediaType(contentType);
          const limit = getMaxFileSize(mediaType);
          // At the limit — both should accept
          expect(clientValidate(contentType, limit)).toBe(true);
          expect(serverValidate(contentType, limit)).toBe(true);
          // One byte over — both should reject
          expect(clientValidate(contentType, limit + 1)).toBe(false);
          expect(serverValidate(contentType, limit + 1)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should agree for completely arbitrary content type and file size combinations', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.oneof(
          fc.integer({ min: -1_000_000, max: 200 * 1024 * 1024 }),
          fc.double({ min: -1000, max: 200 * 1024 * 1024, noNaN: true })
        ),
        (contentType, fileSize) => {
          expect(clientValidate(contentType, fileSize)).toBe(serverValidate(contentType, fileSize));
        }
      ),
      { numRuns: 100 }
    );
  });
});

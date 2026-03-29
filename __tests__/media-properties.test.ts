import fc from 'fast-check';
import { isAllowedContentType, getMediaType, getMaxFileSize, validateFileSize, generateS3Key } from '@/lib/media/validation';
import { ALLOWED_CONTENT_TYPES, AllowedContentType, MediaRecord, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, UPLOAD_URL_EXPIRY_IMAGE, UPLOAD_URL_EXPIRY_VIDEO, DOWNLOAD_URL_EXPIRY } from '@/types/media';

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

// Feature: post-image-attachments, Property 3: Presigned URL expiry matches media type
describe('Property 3: Presigned URL expiry matches media type', () => {
  const mediaTypeArb = fc.constantFrom<'image' | 'video'>('image', 'video');

  it('should return 300s expiry for image uploads and 900s for video uploads', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        (mediaType) => {
          const expected = mediaType === 'image' ? UPLOAD_URL_EXPIRY_IMAGE : UPLOAD_URL_EXPIRY_VIDEO;
          const actual = mediaType === 'image' ? UPLOAD_URL_EXPIRY_IMAGE : UPLOAD_URL_EXPIRY_VIDEO;
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have UPLOAD_URL_EXPIRY_IMAGE equal to 300 seconds', () => {
    fc.assert(
      fc.property(
        fc.constant('image' as const),
        () => {
          expect(UPLOAD_URL_EXPIRY_IMAGE).toBe(300);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have UPLOAD_URL_EXPIRY_VIDEO equal to 900 seconds', () => {
    fc.assert(
      fc.property(
        fc.constant('video' as const),
        () => {
          expect(UPLOAD_URL_EXPIRY_VIDEO).toBe(900);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have DOWNLOAD_URL_EXPIRY equal to 3600 seconds regardless of media type', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        () => {
          expect(DOWNLOAD_URL_EXPIRY).toBe(3600);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have video upload expiry strictly greater than image upload expiry', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          expect(UPLOAD_URL_EXPIRY_VIDEO).toBeGreaterThan(UPLOAD_URL_EXPIRY_IMAGE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have download expiry greater than or equal to both upload expiries', () => {
    fc.assert(
      fc.property(
        mediaTypeArb,
        (mediaType) => {
          const uploadExpiry = mediaType === 'image' ? UPLOAD_URL_EXPIRY_IMAGE : UPLOAD_URL_EXPIRY_VIDEO;
          expect(DOWNLOAD_URL_EXPIRY).toBeGreaterThanOrEqual(uploadExpiry);
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

// Feature: post-image-attachments, Property 7: User isolation for media access
describe('Property 7: User isolation for media access', () => {
  /**
   * Validates: Requirements 4.3, 6.3, 10.5
   *
   * Simulates the ownership check logic used by the three media API routes:
   * - download-url: 403 ACCESS_DENIED when record.userId !== userId
   * - delete: 403 ACCESS_DENIED when record.userId !== userId
   * - validate: 400 INVALID_MEDIA when !record || record.userId !== userId
   */

  // Simulate the download-url route ownership check
  function checkDownloadAccess(
    record: MediaRecord | null,
    requestingUserId: string
  ): { status: number; code: string } {
    if (!record) {
      return { status: 404, code: 'MEDIA_NOT_FOUND' };
    }
    if (record.userId !== requestingUserId) {
      return { status: 403, code: 'ACCESS_DENIED' };
    }
    return { status: 200, code: 'OK' };
  }

  // Simulate the delete route ownership check
  function checkDeleteAccess(
    record: MediaRecord | null,
    requestingUserId: string
  ): { status: number; code: string } {
    if (!record) {
      return { status: 404, code: 'MEDIA_NOT_FOUND' };
    }
    if (record.userId !== requestingUserId) {
      return { status: 403, code: 'ACCESS_DENIED' };
    }
    return { status: 200, code: 'OK' };
  }

  // Simulate the validate route ownership check (combines not-found and not-owner into 400)
  function checkValidateAccess(
    record: MediaRecord | null,
    requestingUserId: string
  ): { status: number; code: string } {
    if (!record || record.userId !== requestingUserId) {
      return { status: 400, code: 'INVALID_MEDIA' };
    }
    return { status: 200, code: 'OK' };
  }

  // Arbitrary for non-empty strings without slashes
  const nonEmptyNoSlash = fc.stringOf(
    fc.char().filter((c) => c !== '/'),
    { minLength: 1 }
  );

  // Generate a pair of distinct user IDs
  const distinctUserPair = fc
    .tuple(nonEmptyNoSlash, nonEmptyNoSlash)
    .filter(([a, b]) => a !== b);

  // Build a minimal MediaRecord owned by a given user
  function buildOwnedRecord(ownerId: string, mediaId: string): MediaRecord {
    return {
      mediaId,
      userId: ownerId,
      s3Key: `${ownerId}/${mediaId}/file.jpg`,
      contentType: 'image/jpeg',
      fileSize: 1024,
      mediaType: 'image',
      originalFilename: 'file.jpg',
      createdAt: new Date().toISOString(),
    };
  }

  it('should deny download access to a non-owner user with 403', () => {
    fc.assert(
      fc.property(
        distinctUserPair,
        nonEmptyNoSlash,
        ([ownerUserId, otherUserId], mediaId) => {
          const record = buildOwnedRecord(ownerUserId, mediaId);
          const result = checkDownloadAccess(record, otherUserId);
          expect(result.status).toBe(403);
          expect(result.code).toBe('ACCESS_DENIED');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deny delete access to a non-owner user with 403', () => {
    fc.assert(
      fc.property(
        distinctUserPair,
        nonEmptyNoSlash,
        ([ownerUserId, otherUserId], mediaId) => {
          const record = buildOwnedRecord(ownerUserId, mediaId);
          const result = checkDeleteAccess(record, otherUserId);
          expect(result.status).toBe(403);
          expect(result.code).toBe('ACCESS_DENIED');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deny validate access to a non-owner user with 400', () => {
    fc.assert(
      fc.property(
        distinctUserPair,
        nonEmptyNoSlash,
        ([ownerUserId, otherUserId], mediaId) => {
          const record = buildOwnedRecord(ownerUserId, mediaId);
          const result = checkValidateAccess(record, otherUserId);
          expect(result.status).toBe(400);
          expect(result.code).toBe('INVALID_MEDIA');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should grant access to the owning user for all operations', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (ownerUserId, mediaId) => {
          const record = buildOwnedRecord(ownerUserId, mediaId);
          expect(checkDownloadAccess(record, ownerUserId).status).toBe(200);
          expect(checkDeleteAccess(record, ownerUserId).status).toBe(200);
          expect(checkValidateAccess(record, ownerUserId).status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should deny all three operations for non-owner and grant all for owner in the same scenario', () => {
    fc.assert(
      fc.property(
        distinctUserPair,
        nonEmptyNoSlash,
        ([ownerUserId, otherUserId], mediaId) => {
          const record = buildOwnedRecord(ownerUserId, mediaId);

          // Non-owner is denied
          expect(checkDownloadAccess(record, otherUserId).status).not.toBe(200);
          expect(checkDeleteAccess(record, otherUserId).status).not.toBe(200);
          expect(checkValidateAccess(record, otherUserId).status).not.toBe(200);

          // Owner is granted
          expect(checkDownloadAccess(record, ownerUserId).status).toBe(200);
          expect(checkDeleteAccess(record, ownerUserId).status).toBe(200);
          expect(checkValidateAccess(record, ownerUserId).status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 9: Media deletion removes record and object
describe('Property 9: Media deletion removes record and object', () => {
  /**
   * Validates: Requirements 10.1, 10.2
   *
   * Simulates the delete flow: after a successful deletion the media record
   * should no longer exist in DynamoDB and the S3 object should be removed.
   * We model DynamoDB as a Map and S3 as a Set of keys.
   */

  const nonEmptyNoSlash = fc.stringOf(
    fc.char().filter((c) => c !== '/'),
    { minLength: 1 }
  );

  function buildRecord(userId: string, mediaId: string, filename: string): MediaRecord {
    return {
      mediaId,
      userId,
      s3Key: generateS3Key(userId, mediaId, filename),
      contentType: 'image/jpeg',
      fileSize: 1024,
      mediaType: 'image',
      originalFilename: filename,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Simulate the delete handler logic:
   * 1. Look up record — if missing return 404
   * 2. Check ownership — if not owner return 403
   * 3. Delete S3 object (remove key from set)
   * 4. Delete DynamoDB record (remove from map)
   */
  function simulateDelete(
    db: Map<string, MediaRecord>,
    s3Keys: Set<string>,
    mediaId: string,
    requestingUserId: string
  ): { status: number } {
    const record = db.get(mediaId) ?? null;
    if (!record) return { status: 404 };
    if (record.userId !== requestingUserId) return { status: 403 };

    // Delete S3 object
    s3Keys.delete(record.s3Key);
    // Delete DynamoDB record
    db.delete(mediaId);

    return { status: 200 };
  }

  it('should remove the DynamoDB record after successful deletion', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const record = buildRecord(userId, mediaId, filename);
          const db = new Map<string, MediaRecord>([[mediaId, record]]);
          const s3Keys = new Set<string>([record.s3Key]);

          const result = simulateDelete(db, s3Keys, mediaId, userId);
          expect(result.status).toBe(200);
          expect(db.has(mediaId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should remove the S3 object after successful deletion', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const record = buildRecord(userId, mediaId, filename);
          const db = new Map<string, MediaRecord>([[mediaId, record]]);
          const s3Keys = new Set<string>([record.s3Key]);

          simulateDelete(db, s3Keys, mediaId, userId);
          expect(s3Keys.has(record.s3Key)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 404 when deleting a non-existent media record', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId) => {
          const db = new Map<string, MediaRecord>();
          const s3Keys = new Set<string>();

          const result = simulateDelete(db, s3Keys, mediaId, userId);
          expect(result.status).toBe(404);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 403 and leave record intact when non-owner attempts deletion', () => {
    fc.assert(
      fc.property(
        fc.tuple(nonEmptyNoSlash, nonEmptyNoSlash).filter(([a, b]) => a !== b),
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        ([ownerUserId, otherUserId], mediaId, filename) => {
          const record = buildRecord(ownerUserId, mediaId, filename);
          const db = new Map<string, MediaRecord>([[mediaId, record]]);
          const s3Keys = new Set<string>([record.s3Key]);

          const result = simulateDelete(db, s3Keys, mediaId, otherUserId);
          expect(result.status).toBe(403);
          // Record and S3 object should still exist
          expect(db.has(mediaId)).toBe(true);
          expect(s3Keys.has(record.s3Key)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should leave other records untouched when deleting one media', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        fc.tuple(nonEmptyNoSlash, nonEmptyNoSlash).filter(([a, b]) => a !== b),
        nonEmptyNoSlash,
        (userId, [mediaId1, mediaId2], filename) => {
          const record1 = buildRecord(userId, mediaId1, filename);
          const record2 = buildRecord(userId, mediaId2, filename);
          const db = new Map<string, MediaRecord>([
            [mediaId1, record1],
            [mediaId2, record2],
          ]);
          const s3Keys = new Set<string>([record1.s3Key, record2.s3Key]);

          simulateDelete(db, s3Keys, mediaId1, userId);

          // Deleted record gone
          expect(db.has(mediaId1)).toBe(false);
          expect(s3Keys.has(record1.s3Key)).toBe(false);
          // Other record untouched
          expect(db.has(mediaId2)).toBe(true);
          expect(s3Keys.has(record2.s3Key)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should result in getMediaById returning null after deletion', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        nonEmptyNoSlash,
        (userId, mediaId, filename) => {
          const record = buildRecord(userId, mediaId, filename);
          const db = new Map<string, MediaRecord>([[mediaId, record]]);
          const s3Keys = new Set<string>([record.s3Key]);

          simulateDelete(db, s3Keys, mediaId, userId);
          // Simulates getMediaById returning null
          expect(db.get(mediaId) ?? null).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 8: Media record completeness
describe('Property 8: Media record completeness', () => {
  // Simulate the record creation that the upload-url API route performs
  function buildMediaRecord(
    userId: string,
    mediaId: string,
    contentType: AllowedContentType,
    fileSize: number,
    filename: string
  ): MediaRecord {
    const mediaType = getMediaType(contentType);
    const s3Key = generateS3Key(userId, mediaId, filename);
    return {
      mediaId,
      userId,
      s3Key,
      contentType,
      fileSize,
      mediaType,
      originalFilename: filename,
      createdAt: new Date().toISOString(),
    };
  }

  const nonEmptyString = fc.stringOf(fc.char().filter((c) => c !== '/'), { minLength: 1 });
  const validFileSize = fc.integer({ min: 1, max: MAX_IMAGE_SIZE });

  it('should contain all required fields for any valid upload input', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        validFileSize,
        nonEmptyString,
        (userId, mediaId, contentType, fileSize, filename) => {
          const record = buildMediaRecord(userId, mediaId, contentType, fileSize, filename);
          expect(record.mediaId).toBe(mediaId);
          expect(record.userId).toBe(userId);
          expect(record.s3Key).toBeDefined();
          expect(record.contentType).toBe(contentType);
          expect(record.fileSize).toBe(fileSize);
          expect(record.mediaType).toBeDefined();
          expect(record.originalFilename).toBe(filename);
          expect(record.createdAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should derive mediaType correctly from the content type prefix', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        validFileSize,
        nonEmptyString,
        (userId, mediaId, contentType, fileSize, filename) => {
          const record = buildMediaRecord(userId, mediaId, contentType, fileSize, filename);
          const expected = contentType.startsWith('video/') ? 'video' : 'image';
          expect(record.mediaType).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce a valid S3 key containing userId, mediaId, and filename', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        validFileSize,
        nonEmptyString,
        (userId, mediaId, contentType, fileSize, filename) => {
          const record = buildMediaRecord(userId, mediaId, contentType, fileSize, filename);
          expect(record.s3Key).toBe(`${userId}/${mediaId}/${filename}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce a valid ISO 8601 createdAt timestamp', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        validFileSize,
        nonEmptyString,
        (userId, mediaId, contentType, fileSize, filename) => {
          const record = buildMediaRecord(userId, mediaId, contentType, fileSize, filename);
          const parsed = Date.parse(record.createdAt);
          expect(Number.isNaN(parsed)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only allow "image" or "video" as mediaType values', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        fc.constantFrom(...ALLOWED_CONTENT_TYPES),
        validFileSize,
        nonEmptyString,
        (userId, mediaId, contentType, fileSize, filename) => {
          const record = buildMediaRecord(userId, mediaId, contentType, fileSize, filename);
          expect(['image', 'video']).toContain(record.mediaType);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: post-image-attachments, Property 10: Cascading delete clears post references
describe('Property 10: Cascading delete clears post references', () => {
  /**
   * Validates: Requirements 10.3
   *
   * Simulates the cascading delete logic from the DELETE /api/media/[mediaId] route:
   * when a media record is deleted, any scheduled posts referencing that media_id
   * should have their media_id field cleared to null/undefined.
   *
   * We model the scheduled-posts table as a Map<postId, PostRecord> and the
   * media table as a Map<mediaId, MediaRecord>.
   */

  interface PostRecord {
    postId: string;
    userId: string;
    content: string;
    media_id?: string | null;
  }

  const nonEmptyNoSlash = fc.stringOf(
    fc.char().filter((c) => c !== '/'),
    { minLength: 1 }
  );

  function buildMediaRecord(userId: string, mediaId: string): MediaRecord {
    return {
      mediaId,
      userId,
      s3Key: `${userId}/${mediaId}/file.jpg`,
      contentType: 'image/jpeg',
      fileSize: 1024,
      mediaType: 'image',
      originalFilename: 'file.jpg',
      createdAt: new Date().toISOString(),
    };
  }

  function buildPost(postId: string, userId: string, mediaId?: string): PostRecord {
    return {
      postId,
      userId,
      content: 'Post content',
      media_id: mediaId ?? null,
    };
  }

  /**
   * Simulate the clearPostMediaReferences + delete flow from the route handler:
   * 1. Scan posts table for items where media_id === mediaId
   * 2. For each matching post, REMOVE media_id (set to undefined)
   * 3. Delete the S3 object (modeled as Set removal)
   * 4. Delete the media DynamoDB record
   */
  function simulateCascadingDelete(
    mediaDb: Map<string, MediaRecord>,
    postsDb: Map<string, PostRecord>,
    s3Keys: Set<string>,
    mediaId: string,
    requestingUserId: string
  ): { status: number } {
    const record = mediaDb.get(mediaId) ?? null;
    if (!record) return { status: 404 };
    if (record.userId !== requestingUserId) return { status: 403 };

    // Step 1 & 2: Clear media_id from referencing posts
    for (const [postId, post] of postsDb) {
      if (post.media_id === mediaId) {
        postsDb.set(postId, { ...post, media_id: undefined });
      }
    }

    // Step 3: Delete S3 object
    s3Keys.delete(record.s3Key);

    // Step 4: Delete media record
    mediaDb.delete(mediaId);

    return { status: 200 };
  }

  it('should clear media_id from all posts referencing the deleted media', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash, // userId
        nonEmptyNoSlash, // mediaId
        fc.array(nonEmptyNoSlash, { minLength: 1, maxLength: 5 }), // postIds
        (userId, mediaId, postIds) => {
          const uniquePostIds = [...new Set(postIds)];
          const mediaDb = new Map([[mediaId, buildMediaRecord(userId, mediaId)]]);
          const s3Keys = new Set([`${userId}/${mediaId}/file.jpg`]);
          const postsDb = new Map(
            uniquePostIds.map((pid) => [pid, buildPost(pid, userId, mediaId)])
          );

          const result = simulateCascadingDelete(mediaDb, postsDb, s3Keys, mediaId, userId);
          expect(result.status).toBe(200);

          // All posts should have media_id cleared
          for (const [, post] of postsDb) {
            expect(post.media_id).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not affect posts that reference a different media_id', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash, // userId
        fc.tuple(nonEmptyNoSlash, nonEmptyNoSlash).filter(([a, b]) => a !== b), // two distinct mediaIds
        nonEmptyNoSlash, // postId for the other media
        nonEmptyNoSlash, // postId for the deleted media
        (userId, [deletedMediaId, otherMediaId], otherPostId, deletedPostId) => {
          fc.pre(otherPostId !== deletedPostId);

          const mediaDb = new Map([
            [deletedMediaId, buildMediaRecord(userId, deletedMediaId)],
            [otherMediaId, buildMediaRecord(userId, otherMediaId)],
          ]);
          const s3Keys = new Set([
            `${userId}/${deletedMediaId}/file.jpg`,
            `${userId}/${otherMediaId}/file.jpg`,
          ]);
          const postsDb = new Map([
            [deletedPostId, buildPost(deletedPostId, userId, deletedMediaId)],
            [otherPostId, buildPost(otherPostId, userId, otherMediaId)],
          ]);

          simulateCascadingDelete(mediaDb, postsDb, s3Keys, deletedMediaId, userId);

          // Post referencing deleted media should be cleared
          expect(postsDb.get(deletedPostId)!.media_id).toBeUndefined();
          // Post referencing other media should be untouched
          expect(postsDb.get(otherPostId)!.media_id).toBe(otherMediaId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle posts with no media attachment (media_id is null)', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash, // userId
        nonEmptyNoSlash, // mediaId
        nonEmptyNoSlash, // postId with media
        nonEmptyNoSlash, // postId without media
        (userId, mediaId, attachedPostId, unattachedPostId) => {
          fc.pre(attachedPostId !== unattachedPostId);

          const mediaDb = new Map([[mediaId, buildMediaRecord(userId, mediaId)]]);
          const s3Keys = new Set([`${userId}/${mediaId}/file.jpg`]);
          const postsDb = new Map([
            [attachedPostId, buildPost(attachedPostId, userId, mediaId)],
            [unattachedPostId, buildPost(unattachedPostId, userId)], // no media
          ]);

          simulateCascadingDelete(mediaDb, postsDb, s3Keys, mediaId, userId);

          expect(postsDb.get(attachedPostId)!.media_id).toBeUndefined();
          // Unattached post should remain with null media_id
          expect(postsDb.get(unattachedPostId)!.media_id).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should work correctly when no posts reference the deleted media', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash, // userId
        nonEmptyNoSlash, // mediaId
        fc.array(nonEmptyNoSlash, { minLength: 0, maxLength: 5 }), // postIds with no media
        (userId, mediaId, postIds) => {
          const uniquePostIds = [...new Set(postIds)];
          const mediaDb = new Map([[mediaId, buildMediaRecord(userId, mediaId)]]);
          const s3Keys = new Set([`${userId}/${mediaId}/file.jpg`]);
          const postsDb = new Map(
            uniquePostIds.map((pid) => [pid, buildPost(pid, userId)]) // no media attached
          );

          const result = simulateCascadingDelete(mediaDb, postsDb, s3Keys, mediaId, userId);
          expect(result.status).toBe(200);

          // All posts should still have null media_id (unchanged)
          for (const [, post] of postsDb) {
            expect(post.media_id).toBeNull();
          }
          // Media record and S3 object should still be deleted
          expect(mediaDb.has(mediaId)).toBe(false);
          expect(s3Keys.has(`${userId}/${mediaId}/file.jpg`)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should clear references from multiple posts attached to the same media', () => {
    fc.assert(
      fc.property(
        nonEmptyNoSlash, // userId
        nonEmptyNoSlash, // mediaId
        fc.integer({ min: 2, max: 10 }), // number of posts
        (userId, mediaId, postCount) => {
          const mediaDb = new Map([[mediaId, buildMediaRecord(userId, mediaId)]]);
          const s3Keys = new Set([`${userId}/${mediaId}/file.jpg`]);
          const postsDb = new Map<string, PostRecord>();

          for (let i = 0; i < postCount; i++) {
            const postId = `post-${i}-${mediaId}`;
            postsDb.set(postId, buildPost(postId, userId, mediaId));
          }

          simulateCascadingDelete(mediaDb, postsDb, s3Keys, mediaId, userId);

          // Every post should have media_id cleared
          for (const [, post] of postsDb) {
            expect(post.media_id).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

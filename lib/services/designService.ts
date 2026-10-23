/**
 * Designs made in the Designer: create, list, open, save and delete
 */

import { randomUUID } from 'crypto';
import { DesignInputSchema, type DesignRecord } from '../design/types';
import { getDesignRepository } from './container';

export class DesignNotFoundError extends Error {
  statusCode = 404;
  constructor() {
    super('That design doesn’t exist any more');
    this.name = 'DesignNotFoundError';
  }
}

export const MAX_DESIGNS = 500;

export class DesignService {
  constructor(private repo = getDesignRepository()) {}

  list(userId: string): Promise<DesignRecord[]> {
    return this.repo.listByUser(userId, MAX_DESIGNS);
  }

  async get(userId: string, designId: string): Promise<DesignRecord> {
    const design = await this.repo.get(designId, userId);
    if (!design) throw new DesignNotFoundError();
    return design;
  }

  async create(userId: string, input: unknown): Promise<DesignRecord> {
    const { name, source, doc, attachedTo, mediaId } = DesignInputSchema.parse(input);
    const now = new Date().toISOString();
    return this.repo.put({ designId: randomUUID(), userId, name, source, doc, attachedTo, mediaId, createdAt: now, updatedAt: now });
  }

  async update(userId: string, designId: string, input: unknown): Promise<DesignRecord> {
    const existing = await this.get(userId, designId);
    const { name, source, doc, attachedTo, mediaId } = DesignInputSchema.parse(input);
    // Keeps the post it's attached to unless told otherwise; a changed design needs a new image
    return this.repo.put({
      ...existing,
      name,
      source,
      doc,
      attachedTo: attachedTo ?? existing.attachedTo,
      mediaId,
      updatedAt: new Date().toISOString(),
    });
  }

  async remove(userId: string, designId: string): Promise<void> {
    await this.get(userId, designId);
    await this.repo.delete(designId);
  }
}

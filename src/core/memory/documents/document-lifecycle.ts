import { documentLibraryStore } from "./document-file-store";
import { auditLogStore } from "../../security/audit-file-store";

export class DocumentLifecycleService {
  async disableDocument(documentId: string): Promise<boolean> {
    const success = await documentLibraryStore.updateEntryStatus(documentId, 'disabled');
    if (success) {
      auditLogStore.log({
        action: 'memory.write', // Use existing action from AuditAction
        status: 'document.disabled',
        metadata: { documentId }
      });
    }
    return success;
  }

  async restoreDocument(documentId: string): Promise<boolean> {
    const success = await documentLibraryStore.updateEntryStatus(documentId, 'active');
    if (success) {
      auditLogStore.log({
        action: 'memory.write',
        status: 'document.restored',
        metadata: { documentId }
      });
    }
    return success;
  }

  async softDeleteDocument(documentId: string): Promise<boolean> {
    const success = await documentLibraryStore.updateEntryStatus(documentId, 'deleted');
    if (success) {
      auditLogStore.log({
        action: 'memory.write',
        status: 'document.deleted',
        metadata: { documentId }
      });
    }
    return success;
  }
}

export const documentLifecycleService = new DocumentLifecycleService();

export class SingleWorkflowGuard {
  private static activeWorkflowId: string | null = null;

  static acquire(workflowId: string): void {
    if (this.activeWorkflowId && this.activeWorkflowId !== workflowId) {
      throw new Error("WORKFLOW_ALREADY_RUNNING");
    }
    this.activeWorkflowId = workflowId;
  }

  static release(workflowId: string): void {
    if (this.activeWorkflowId === workflowId) {
      this.activeWorkflowId = null;
    }
  }

  static isRunning(): boolean {
    return this.activeWorkflowId !== null;
  }
}

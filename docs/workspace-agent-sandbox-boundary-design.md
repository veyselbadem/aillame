# Phase 93 — Workspace Agent Sandbox Boundary Design

**Document Status:** Design Documentation Only | No Implementation | No Execution Pathway | No Runtime Behavior
**Date:** 12 Mayıs 2026 | **Phase:** 93 | **Track:** Workspace Agent Execution Design (Separate from Archived Safety Baseline v1.0.0)

---

## 1. Overview: Sandbox Boundary Design Phase

Phase 93 defines the sandbox boundary requirements for secure command execution within the Workspace Agent. This is **documentation-only** specification of isolation boundaries, prohibited host access patterns, filesystem restrictions, and process/network constraints.

**Phase 93 Status:**
- ✅ Design documentation only
- ❌ NO runtime behavior
- ❌ NO sandbox implementation
- ❌ NO execution pathways
- ❌ NO file write, shell access, or permission grant
- ❌ NO persistence mechanisms
- ❌ NO ActionExecutor or Command Registry

---

## 2. Reference to Phase 92 Threat Model

This sandbox design directly addresses **5 threat categories identified in Phase 92**:

### Threat Category 1: Privilege Escalation Risks
**Design Response:** Sandbox isolates execution in unprivileged process context with no capability elevation mechanisms.

### Threat Category 2: Command Injection Risks
**Design Response:** Sandbox enforces allowlisted command parsing with no shell interpretation.

### Threat Category 3: Data Exfiltration Risks
**Design Response:** Sandbox restricts filesystem and network access to designated boundaries.

### Threat Category 4: Rollback and Atomicity Risks
**Design Response:** Sandbox provides transactional execution context (design pattern, not implemented).

### Threat Category 5: Audit Log Tampering Risks
**Design Response:** Sandbox execution generates immutable audit records in read-only audit store.

---

## 3. Safety Baseline v1.0.0 Archived Status

### Archived Baseline Protection: **CONFIRMED UNMODIFIED**

```
Workspace Agent Safety Baseline v1.0.0:
  ✅ FROZEN (Phases 41-91 completed and sealed)
  ✅ READ-ONLY (archived, no modifications allowed)
  ✅ RELEASED (tag: workspace-agent-safety-baseline-v1.0.0)
  ✅ INDEPENDENT GOVERNANCE (reference only for design input)
  ✅ NO-EXECUTION GUARANTEE (permanent no-execution seal)

Phase 93 Scope:
  ✅ COMPLETELY SEPARATE from archived baseline
  ✅ DESIGN DOCUMENTATION ONLY
  ✅ INDEPENDENT security review required for implementation
  ✅ NO changes to archived baseline v1.0.0
```

---

## 4. Sandbox Boundary Design Requirements

### 4.1 Core Isolation Requirements

The sandbox must enforce **five core isolation boundaries** at execution time (design specification only):

#### 4.1.1 Process Isolation Boundary
- **Requirement:** Workspace Agent execution operates in isolated process context, separate from host or parent application process
- **Isolation Model:** 
  - Child process spawned with restricted environment
  - No shared memory with parent process
  - Isolated file descriptor table
  - Separate resource quotas (memory, CPU time, file handles)
- **Failure Behavior:** If process isolation fails, default to DENY execution and log isolation failure

#### 4.1.2 User Context Isolation Boundary
- **Requirement:** Workspace Agent execution runs under unprivileged user context with no privilege elevation
- **Isolation Model:**
  - Execution user != system user
  - Execution user != application user (if different)
  - No setuid/setgid mechanisms
  - No sudo or privilege delegation
- **Failure Behavior:** If privilege escalation detected, DENY execution and audit escalation attempt

#### 4.1.3 Environment Variable Isolation Boundary
- **Requirement:** Workspace Agent process receives sanitized environment with no sensitive variables leaked from parent
- **Isolation Model:**
  - Parent environment variables stripped or whitelisted
  - New environment constructed with only safe, known variables
  - No PATH manipulation pointing to attacker-controlled directories
  - No LD_PRELOAD or similar hijacking mechanisms
- **Failure Behavior:** If malicious environment variables detected, DENY execution and log environment threat

#### 4.1.4 Capability Isolation Boundary
- **Requirement:** No Linux capabilities or Windows privilege tokens beyond minimum required (design level)
- **Isolation Model:**
  - All unnecessary capabilities dropped (Linux: CAP_NET_ADMIN, CAP_SYS_ADMIN, etc.)
  - No effective privileges granted to isolated process
  - No token privilege delegation (Windows)
  - Execution inherits minimal default set only
- **Failure Behavior:** If capability escalation attempted, DENY execution

#### 4.1.5 Resource Quota Boundary
- **Requirement:** Workspace Agent execution subject to resource limits preventing denial-of-service
- **Isolation Model:**
  - Memory limit enforced (ulimit -m or cgroup memory.limit_in_bytes)
  - CPU time limit enforced (ulimit -t or cgroup cpu.cfs_quota_us)
  - File descriptor limit enforced (ulimit -n or cgroup pids.max)
  - Process count limit enforced (no forking or subprocess spawning)
  - File size limit enforced (ulimit -f or cgroup fs limits)
- **Failure Behavior:** If resource quota exceeded, KILL process and log resource violation

---

### 4.2 Prohibited Host Access Boundaries

The sandbox must **DENY by default** all host access except explicitly whitelisted operations:

#### 4.2.1 Prohibited System Calls

**These system calls MUST be blocked by sandbox:**
```
Process Control:
  ❌ clone() — No child process creation (no cloning)
  ❌ fork() — No child process creation (no forking)
  ❌ vfork() — No lightweight process creation
  ❌ exec*() — No process replacement (only allowlisted commands)
  ❌ ptrace() — No process debugging/hijacking

Network:
  ❌ socket() — No raw socket creation
  ❌ bind() — No socket binding
  ❌ listen() — No server mode
  ❌ connect() — No arbitrary network connections
  ❌ setsockopt() — No socket manipulation

Capability Escalation:
  ❌ setuid() / setgid() — No privilege escalation
  ❌ seteuid() / setegid() — No effective privilege escalation
  ❌ setresuid() / setresgid() — No real/saved privilege escalation
  ❌ capset() — No capability elevation
  ❌ prctl() — No privilege-related operations

Module/Dynamic Loading:
  ❌ dlopen() / dlsym() — No dynamic library loading
  ❌ ld_preload usage — No library injection

IPC:
  ❌ msgget() / msgsnd() / msgrcv() — No message queue access
  ❌ semget() / semop() — No semaphore access
  ❌ shmget() / shmat() — No shared memory access
```

#### 4.2.2 Prohibited Host Operations

**These operations MUST be blocked by sandbox:**
```
Registry/Configuration (Windows/Linux):
  ❌ Registry write (Windows)
  ❌ /etc/ modifications (Linux)
  ❌ /proc/sys/ write (Linux)
  ❌ systemd service registration
  ❌ cron job modification

Device Access:
  ❌ /dev/mem access
  ❌ /dev/kmem access
  ❌ Raw device I/O
  ❌ USB device access
  ❌ Serial port access

Kernel/Runtime Modification:
  ❌ Kernel module loading (insmod)
  ❌ SELinux policy modification
  ❌ Firewall rule modification
  ❌ Routing table modification
  ❌ DNS configuration modification
```

#### 4.2.3 Default-Deny Pattern

**Sandbox enforcement model:**
```
All operations: DEFAULT DENY
  ├─ Allowlist check
  │  └─ Explicit whitelist match? → ALLOW
  │     └─ NO → DENY and log
  ├─ Policy evaluation
  │  └─ Policy permits operation? → ALLOW
  │     └─ NO → DENY and log
  └─ Result: DENY (no implicit ALLOW)
```

**Failure Behavior:** If host access attempted outside allowlist, DENY operation and log unauthorized access attempt.

---

### 4.3 Filesystem Boundary Design

The sandbox defines strict filesystem isolation:

#### 4.3.1 Filesystem Access Model

**Allowed Access Categories:**

1. **Read-Only Access Zones:**
   - Workspace configuration files (read-only)
   - Workspace project files (read-only)
   - System utility binaries (read-only, allowlisted)
   - Shared libraries (read-only, allowlisted)
   - Documentation and help files (read-only)

2. **Write-Only Access Zones:**
   - Audit log directory (append-only, immutable write)
   - Temporary execution workspace (isolated, ephemeral)
   - Command output buffer (isolated, memory-only until flushed to audit)

3. **No Access Zones:**
   - Parent directory traversal (no ../../../ escape)
   - System directories (/etc, /sys, /proc, Windows\System32)
   - User home directory outside workspace scope
   - Other user data and credentials
   - Environment variable files
   - SSH/GPG key stores
   - Database configuration files

#### 4.3.2 Path Boundary Enforcement

**Filesystem boundary validation:**

```typescript
// Pseudocode: Filesystem path validation
function validateFilesystemPath(requestedPath: string, allowedRoots: string[]): boolean {
  const canonicalPath = resolvePath(requestedPath);
  
  // Check 1: No null bytes
  if (canonicalPath.includes('\0')) return false;
  
  // Check 2: No symlink escape (follow and compare)
  const realPath = fs.realpathSync(canonicalPath);
  if (realPath !== canonicalPath) return false;
  
  // Check 3: No parent directory traversal
  if (canonicalPath.includes('..')) return false;
  
  // Check 4: Must be within allowedRoots
  const isWithinBoundary = allowedRoots.some(root => 
    realPath.startsWith(fs.realpathSync(root))
  );
  
  if (!isWithinBoundary) return false;
  
  // Check 5: No access to sensitive system directories
  const prohibitedPaths = ['/etc', '/sys', '/proc', 'C:\\Windows', 'C:\\Program Files'];
  if (prohibitedPaths.some(p => realPath.startsWith(p))) return false;
  
  return true; // Path is safe
}

// Failure behavior: If path validation fails, DENY file operation and log violation
```

#### 4.3.3 Symlink and Hardlink Prevention

**Symlink/hardlink attack prevention:**
```
Symlink Handling:
  ✅ Detect symlinks in execution path
  ✅ Resolve to real path and re-validate
  ✅ Fail if real path outside boundaries
  ✅ Log symlink resolution attempts

Hardlink Prevention:
  ✅ Verify inode not shared outside boundary
  ✅ Prevent hardlink creation to sensitive files
  ✅ Deny cross-boundary hardlinks
```

**Failure Behavior:** If symlink/hardlink escape detected, DENY file operation and log boundary breach attempt.

---

### 4.4 Process & Network Restrictions (Design Level)

The sandbox restricts process lifecycle and network access:

#### 4.4.1 Process Lifecycle Restrictions

**Process creation restrictions:**
```
Allowed:
  ✅ Main execution process (1 process spawned)
  ✅ Standard input/output pipes to parent

Prohibited:
  ❌ Child process creation (fork/clone)
  ❌ Process replacement (exec of non-allowlisted binaries)
  ❌ Background process spawning
  ❌ Daemon process creation
  ❌ Shell process creation (sh, bash, zsh, cmd, PowerShell)
  ❌ Subprocess forking
```

**Execution model:**
- Single process execution
- Linear execution flow
- No concurrent subprocesses
- No background workers
- No daemon mode

**Failure Behavior:** If child process creation attempted, DENY fork/clone and log subprocess creation attempt.

#### 4.4.2 Network Restrictions

**Network access model:**
```
Allowed:
  ✅ Outbound connections to explicitly whitelisted endpoints
  ✅ DNS queries to designated resolvers only
  ✅ TLS/HTTPS only (no cleartext HTTP or raw TCP)

Prohibited:
  ❌ Inbound listening (no server mode)
  ❌ Raw socket access
  ❌ UDP or non-TLS protocols
  ❌ Connection to non-whitelisted hosts
  ❌ Broadcast/multicast access
  ❌ Network interface manipulation
  ❌ Routing table access
  ❌ DNS resolution to arbitrary servers
```

**Network boundary enforcement:**
```
1. Connection request arrives
2. Check against allowlist (IP:port pairs)
3. If NOT in allowlist → DENY and log
4. If TLS required → verify certificate chain
5. If certificate invalid → DENY and log
6. Allow TLS connection only
```

**Failure Behavior:** If network access attempted outside allowlist, DENY connection and log network access attempt.

---

### 4.5 Failure Behavior & Default-Deny Enforcement

The sandbox operates under **permanent default-DENY model**:

#### 4.5.1 Failure Categories & Responses

| Failure Category | Detection | Response | Logging |
|---|---|---|---|
| **Process Isolation Failure** | Isolation check fails | DENY execution | Log with process context |
| **Privilege Escalation Attempt** | Capability check fails | DENY & KILL process | Log escalation attempt + source |
| **System Call Blocked** | Syscall not in allowlist | KILL process | Log blocked syscall + stack trace |
| **Filesystem Boundary Breach** | Path validation fails | DENY file operation | Log path + attempted operation |
| **Symlink/Hardlink Escape** | Boundary verification fails | DENY operation | Log inode + target path |
| **Network Access Denied** | Host not in allowlist | DENY connection | Log destination + protocol |
| **Resource Quota Exceeded** | Quota check fails | KILL process | Log resource + limit violated |
| **Command Not Allowlisted** | Allowlist check fails | DENY execution | Log requested command |
| **Environment Variable Threat** | Suspicious variable detected | DENY execution | Log variable name + value |
| **Audit Log Tampering** | Audit write fails | KILL process + ALERT | Log tampering attempt |

#### 4.5.2 Default-Deny Semantics

**All operations follow default-DENY:**

```
Operation Request:
  ├─ Is operation in explicit allowlist? 
  │  └─ YES → Evaluate policy
  │  └─ NO → DENY (default-deny semantics)
  │
  ├─ Does policy permit?
  │  └─ YES → Execute operation
  │  └─ NO → DENY (policy override)
  │
  └─ Result: Operation either ALLOWED (explicit + policy) or DENIED (no permission)
```

**Zero implicit permissions:** No operation is allowed by default. All permissions must be:
1. **Explicitly enumerated** in allowlist, AND
2. **Permitted by policy**, AND
3. **Safe to execute** (no security violation)

#### 4.5.3 Cascading Denial

**If any boundary is breached, cascade to total denial:**

```
Execution Flow:
  1. Pre-execution validation
     └─ Fail → DENY execution, log, exit
  2. Process creation
     └─ Fail → DENY execution, log, exit
  3. Isolation enforcement
     └─ Fail → DENY execution, kill process, log, exit
  4. Environment sanitization
     └─ Fail → DENY execution, kill process, log, exit
  5. Resource quota enforcement
     └─ Fail → KILL process, log, exit
  6. Runtime boundary enforcement
     └─ Fail → DENY operation, KILL process, log, exit
```

**Any boundary failure triggers complete execution termination and audit logging.**

---

## 5. No Implementation Scope: Phase 93 Documentation-Only Declaration

### 5.1 Explicit No-Implementation Boundary

**This document ONLY specifies design requirements. Phase 93 does NOT include:**

```
❌ NO Sandbox Runtime Implementation
   ├─ NO seccomp filter creation
   ├─ NO cgroup/container setup
   ├─ NO AppArmor/SELinux policy
   ├─ NO process isolation code
   └─ NO resource limit enforcement

❌ NO Execution Pathway
   ├─ NO ActionExecutor implementation
   ├─ NO Command Registry creation
   ├─ NO execution dispatch logic
   ├─ NO command execution
   └─ NO subprocess spawning

❌ NO File Operations
   ├─ NO configuration file write
   ├─ NO audit log creation
   ├─ NO temporary file handling
   ├─ NO state persistence
   └─ NO modification to workspace

❌ NO Shell or System Access
   ├─ NO shell command execution
   ├─ NO system call interception
   ├─ NO device access
   ├─ NO network socket creation
   └─ NO capability/token issuance

❌ NO Permission Mechanisms
   ├─ NO permission grant logic
   ├─ NO capability elevation
   ├─ NO privilege delegation
   ├─ NO token generation
   └─ NO authorization decision engine
```

### 5.2 Design Documentation Status

**Phase 93 Content:**
- ✅ Sandbox boundary requirements (design specification)
- ✅ Isolation boundary definitions (specifications only)
- ✅ Prohibited host access categories (threat modeling)
- ✅ Filesystem boundaries (design patterns)
- ✅ Process/network restrictions (design model)
- ✅ Failure behavior expectations (design contracts)
- ✅ Default-deny semantics (design principle)

**Phase 93 Does NOT contain:**
- ❌ Implementation code
- ❌ NO ActionExecutor implementation
- ❌ NO Command Registry stated or created
- ❌ Runtime behavior
- ❌ Execution logic
- ❌ File write operations
- ❌ Network initialization
- ❌ Process spawning code
- ❌ Permission grant mechanism

---

## 6. Critical Declarations

### 6.1 Archived Safety Baseline Independence Declaration

**CONFIRMED:** Workspace Agent Safety Baseline v1.0.0 (Phases 41–91) remains:
- ✅ **FROZEN** — No modifications permitted
- ✅ **ARCHIVED** — Release tag published (workspace-agent-safety-baseline-v1.0.0)
- ✅ **READ-ONLY** — Reference-only for design input
- ✅ **INDEPENDENT** — Separate governance model
- ✅ **SEALED** — No-execution guarantee permanent

Phase 93 does NOT modify, implement, or activate any archived baseline content.

### 6.2 Phase 93 Scope Limitation Declaration

**DECLARED:** This Phase 93 document is:
- ✅ **DESIGN-ONLY** — No implementation
- ✅ **DOCUMENTATION** — Specification of requirements
- ✅ **THREAT-INFORMED** — Addresses Phase 92 threat model
- ✅ **FUTURE-ORIENTED** — Input for Phase 94+ design phases
- ✅ **NO-EXECUTION** — Permanent no-execution boundary
- ✅ **NO-PERSISTENCE** — No state modification

### 6.3 Future Implementation Gate Declaration

**REQUIRED:** Any implementation of Phase 93 sandbox design must:
1. Occur in separate future phase (Phase 94+)
2. Undergo independent design review
3. Receive explicit security approval
4. Pass all 9 required gates (Phase 92)
5. Undergo independent security audit
6. NOT modify archived baseline v1.0.0
7. Provide kill switch and rollback capability

**Implementation is PROHIBITED in Phase 93.**

---

## 7. Next Phase Expectations: Phase 94+

### Phase 94 — Permission Model Design (Design-Only)
- Define fine-grained permission categories
- Specify permission grant conditions
- Model multi-level approval workflow
- NO implementation

### Phase 95 — Rollback Strategy Design (Design-Only)
- Define transaction/atomic execution model
- Specify undo operation semantics
- Model rollback failure cases
- NO implementation

### Phase 96 — Audit Log Contract (Design-Only)
- Define immutable log format
- Specify forensically analyzable structure
- Model tamper detection mechanisms
- NO implementation

### Phase 97 — Independent Design Review (Review-Only)
- Review sandbox, permission, rollback, audit designs
- Evaluate against threat model
- Recommend gate approval or revision

### Phase 98 — Security Approval (Approval-Only)
- Security team independent review
- Threat model validation
- Gate acceptance decision
- Implementation gate opened (or required redesign)

---

## 8. Document References and Validation

### 8.1 Cross-References

**This document references:**
- [Phase 92: Execution Design Track Kickoff](workspace-agent-execution-design-track-kickoff.md) — Threat model foundation
- [Phase 89: Final Release Checklist](workspace-agent-safety-baseline-final-release-checklist.md) — Baseline audit authority
- [Phase 90: Archive Release Tag](workspace-agent-safety-baseline-archive-release-tag.md) — Baseline archive governance

**This document is referenced by:**
- Phase 94+ design documents (permission, rollback, audit)
- Phase 97 independent design review
- Implementation phase (Phase 98+) — after independent security approval

### 8.2 Validation Checklist

**Phase 93 validation requirements:**
- [ ] Sandbox boundary document created
- [ ] 5 core isolation requirements specified
- [ ] Prohibited host access boundaries defined
- [ ] Filesystem boundary design completed
- [ ] Process/network restrictions documented
- [ ] Failure behavior model specified
- [ ] Default-deny semantics confirmed
- [ ] No implementation code present
- [ ] Safety Baseline v1.0.0 protection confirmed
- [ ] Phase 92 threat model referenced
- [ ] Critical declarations present
- [ ] Smoke test validates all requirements
- [ ] Package.json script registered

---

## 9. Status Summary

**Phase 93 — Workspace Agent Sandbox Boundary Design**

| Component | Status | Notes |
|---|---|---|
| **Sandbox Boundary Design** | 🟡 IN PROGRESS | Document created, awaiting validation |
| **Core Isolation (5 boundaries)** | ✅ DESIGNED | Process, user, environment, capability, quota |
| **Prohibited Host Access** | ✅ DESIGNED | System calls, host operations, default-deny |
| **Filesystem Boundary** | ✅ DESIGNED | Path validation, symlink prevention, zone model |
| **Process/Network Restrictions** | ✅ DESIGNED | Single process, allowlist-only network |
| **Failure Behavior & Default-Deny** | ✅ DESIGNED | Cascade model, default-DENY semantics |
| **No-Implementation Boundary** | ✅ DECLARED | Phase 93 documentation-only confirmed |
| **Smoke Test Script** | 🟡 PENDING | Awaiting creation |
| **Package.json Registration** | 🟡 PENDING | Awaiting script creation |
| **Smoke Test Validation** | 🟡 PENDING | Awaiting registration |
| **Archived Baseline Protection** | ✅ CONFIRMED | Baseline v1.0.0 unmodified, frozen, read-only |

---

**Phase 93 Complete Status: READY FOR VALIDATION**

Document created with sandbox boundary design addressing Phase 92 threat model. All 5 core isolation boundaries specified. Prohibited host access boundaries defined with default-deny semantics. Filesystem, process, and network restrictions documented at design level. No-implementation boundary confirmed. Safety Baseline v1.0.0 protection reiterated. Ready for smoke test validation.

---

**Türkçe Özet / Turkish Summary:**

Phase 93, Workspace Agent Çalışma Alanı Güvenlik Temel Çizgisi (v1.0.0) arşivlenmiş ve değiştirilmez durumdayken, ayrı bir Yürütme Tasarım İzini başlatır. Bu belge, sandbox sınır tasarımını (uygulama YOK) belirtir:

- ✅ 5 temel izolasyon sınırı tanımlandı
- ✅ Yasaklı ana bilgisayar erişimi sınırları belirlendi
- ✅ Dosya sistemi sınırları tasarlandı
- ✅ İşlem/ağ kısıtlamaları tanımlandı
- ✅ Varsayılan-DEN semantiği onaylandı
- ✅ Hiçbir uygulama kodu mevcut değil
- ✅ Temel sürüm v1.0.0 koruması reitere edildi

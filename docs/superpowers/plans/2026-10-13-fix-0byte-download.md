# Fix YouTube 0-Byte Download & Hardened Stream Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the "El servidor devolvió una respuesta vacía (0 bytes)" error by rejecting invalid empty tunnels (`estimated-content-length: -1` and 0-byte initial chunks), rotating across healthy instances, and validating real file downloads end-to-end with the Moli headless browser.

**Architecture:** 
1. Harden `probeTunnelUrl` and extraction filters in `src/services/extractors/cobalt.ts` to detect and discard 0-byte dummy streams before presenting them to the user.
2. In `src/services/extractors/cobalt.ts`, expand the default instance pool with healthy public Cobalt endpoints (e.g., `https://cobaltapi.cjs.nz`, `https://rue-cobalt.xenon.zone`) and fail over sequentially when one returns empty tunnels or bot-blocks.
3. In `src/services/downloadManager.ts`, ensure that if a stream is empty or fails, clear error messages are surfaced, and add graceful fallback handling.
4. Verify with Vitest unit tests and real end-to-end browser execution using `moli` against `http://localhost:5177`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Moli Headless Browser Engine.

**Spec:** User issue: `Error durante la descarga: El servidor devolvió una respuesta vacía (0 bytes).` Tested with YouTube URLs where backend returned dummy tunnels with `estimated-content-length: -1` and 0 bytes.

## Global Constraints

- Pure client-side application running in the browser; all downloads must save actual media bytes (>0 bytes) to disk or memory.
- All code changes must preserve full TypeScript type safety and pass `npm run build` and `npm run test:unit`.
- Real runtime browser verification must be conducted using `/home/jp/.local/bin/moli`.

## Review Focus

1. Blocked YouTube music/restricted video responding with `status: "tunnel"` but empty payload (`estimated-content-length: -1`). Expected: extractor rejects this instance and tries next instance, or reports clear YouTube restriction error if all fail.
2. Direct download of unblocked YouTube video (e.g. `jNQXAC9IVRw` or `dQw4w9WgXcQ`). Expected: valid tunnel probed, downloaded with >0 bytes, no 0-byte file created.
3. Network error or timeout during tunnel probe. Expected: probe safely returns `false` without crashing application.
4. Settings custom Cobalt instance: user's configured instance is tried first before falling back to default instances.
5. End-to-end execution in Moli headless browser: triggering actual download stream returns valid byte chunks and finishes successfully.

---

### Task 1: Harden `probeTunnelUrl` in `cobalt.ts` against Empty and Negative Length Tunnels

**Files:**
- Modify: `src/services/extractors/cobalt.ts:39-97`
- Test: `src/services/extractors/cobalt.test.ts`

**Interfaces:**
- Produces: `probeTunnelUrl(url: string, signal?: AbortSignal, timeoutMs?: number): Promise<boolean>`

- [ ] **Step 1: Write failing unit tests in `cobalt.test.ts` for negative and empty tunnel responses**

```typescript
it('rejects tunnel URL when estimated-content-length is -1', async () => {
  // Mock fetch returning estimated-content-length: -1
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'estimated-content-length': '-1' })
  });
  const valid = await probeTunnelUrl('https://fake-tunnel/stream');
  expect(valid).toBe(false);
});

it('rejects tunnel URL when content-length is 0', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-length': '0' })
  });
  const valid = await probeTunnelUrl('https://fake-tunnel/stream');
  expect(valid).toBe(false);
});

it('accepts tunnel URL when estimated-content-length is positive', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'estimated-content-length': '5242880' })
  });
  const valid = await probeTunnelUrl('https://fake-tunnel/stream');
  expect(valid).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/services/extractors/cobalt.test.ts`
Expected: FAIL because currently `probeTunnelUrl` only checks for `=== 0`, not `<= 0` or `-1`.

- [ ] **Step 3: Update `probeTunnelUrl` in `src/services/extractors/cobalt.ts`**

Update lines 80-92 to check:
```typescript
const clNum = cl !== null ? parseInt(cl.trim(), 10) : null;
const eclNum = ecl !== null ? parseInt(ecl.trim(), 10) : null;

// Reject 0 bytes or negative estimated content length (-1 means backend blocked/empty tunnel)
if ((clNum !== null && clNum <= 0) || (eclNum !== null && eclNum <= 0)) {
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/services/extractors/cobalt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/extractors/cobalt.ts src/services/extractors/cobalt.test.ts
git commit -m "fix(cobalt): reject tunnels with negative or zero content length"
```

---

### Task 2: Update Fallback and Instance Rotation in `cobalt.ts`

**Files:**
- Modify: `src/services/extractors/cobalt.ts:4-30,107-165`
- Test: `src/services/extractors/cobalt.test.ts`

**Interfaces:**
- Consumes: `probeTunnelUrl`
- Produces: `cobaltExtractor.extract(url: string, signal?: AbortSignal): Promise<ExtractionResult>`

- [ ] **Step 1: Write unit test verifying instance rotation when first instance returns invalid tunnel**

Add test to `src/services/extractors/cobalt.test.ts`:
```typescript
it('rotates to next instance when first instance returns empty tunnel', async () => {
  // First instance returns tunnel with ecl -1
  // Second instance returns valid tunnel with ecl > 0
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/services/extractors/cobalt.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement multi-instance retry loop in `cobalt.ts`**

When `probeTunnelUrl(streamUrl)` returns `false`, log a warning and continue to the next instance in `candidateInstances` instead of returning the invalid stream.
Ensure error messages clearly indicate if all instances failed due to YouTube restrictions (`error.api.youtube.login` or empty streams).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/services/extractors/cobalt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/extractors/cobalt.ts src/services/extractors/cobalt.test.ts
git commit -m "fix(cobalt): rotate across instances when tunnel probe fails"
```

---

### Task 3: Improve Error Handling in `downloadManager.ts`

**Files:**
- Modify: `src/services/downloadManager.ts:90-100`
- Test: `src/services/downloadManager.test.ts`

**Interfaces:**
- Produces: `downloadStream(stream: StreamOption, filename: string, onProgress?: (p: DownloadProgress) => void, signal?: AbortSignal): Promise<void>`

- [ ] **Step 1: Write unit test in `downloadManager.test.ts` for empty and negative response handling**

```typescript
it('rejects download immediately with clear error if estimated-content-length is -1 or content-length is 0', async () => {
  // test that downloadStream throws an error and does NOT call triggerBrowserSave
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/services/downloadManager.test.ts`

- [ ] **Step 3: Update `downloadManager.ts` headers check**

Verify headers:
```typescript
const cl = response.headers.get('content-length');
const ecl = response.headers.get('estimated-content-length');
const clNum = cl ? parseInt(cl.trim(), 10) : null;
const eclNum = ecl ? parseInt(ecl.trim(), 10) : null;

if ((clNum !== null && clNum <= 0) || (eclNum !== null && eclNum <= 0)) {
  throw new Error('El servidor devolvió una respuesta vacía o bloqueada por la plataforma (0 bytes).');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/services/downloadManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/downloadManager.ts src/services/downloadManager.test.ts
git commit -m "fix(downloadManager): reject empty or negative content length streams with clear error"
```

---

### Task 4: Real Runtime Verification with Moli Headless Browser

**Files:**
- Create: `scripts/test-moli-download.mjs`

**Interfaces:**
- Consumes: Running dev server on `http://localhost:5177` and `/home/jp/.local/bin/moli`
- Produces: Downloaded media buffer verification (>0 bytes)

- [ ] **Step 1: Create verification script `scripts/test-moli-download.mjs`**

The script uses `moli fetch` or Node fetch against the app extraction pipeline, selects a real video stream, and downloads real bytes verifying `totalBytes > 0` and `byteLength > 0`.

- [ ] **Step 2: Execute script with Moli and verify successful download**

Run: `node scripts/test-moli-download.mjs`
Expected: Download successful, >500 KB received, 0 errors.

- [ ] **Step 3: Run full suite and build**

Run: `npm run test:unit && npm run build`
Expected: All tests pass, build succeeds with 0 errors.

- [ ] **Step 4: Commit and push**

```bash
git add scripts/test-moli-download.mjs
git commit -m "test(moli): add automated runtime download verification"
git push origin main
```

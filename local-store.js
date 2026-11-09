/* One small IndexedDB store. Official releases and private records never write the old key. */
(function (root) {
  'use strict';
  const DB_NAME = 'paris-pocket-local', DB_VERSION = 1, TABLE = 'records';
  const TRIP_ID = 'paris-2026', FORMAT = 'paris-pocket-backup-v2';
  const LEGACY_KEY = 'paris-pocket-personal-v1', MAX_BYTES = 8 * 1024 * 1024;
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,160}$/.test(value) && !['constructor', 'prototype', '__proto__'].includes(value);
  const error = (message, code = 'INVALID_DATA') => Object.assign(new Error(message), { code });
  const now = () => new Date().toISOString();
  function dependencies() {
    const official = root.ParisOfficial;
    if (!official) throw error('官方行程校验模块尚未载入', 'NOT_READY');
    return official;
  }
  function safeJSON(value, depth = 0) {
    if (depth > 64) throw error('资料层级过深');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (Array.isArray(value)) { value.forEach(item => safeJSON(item, depth + 1)); return; }
    if (!record(value)) throw error('资料包含不支持的内容');
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw error('资料包含不安全的字段');
      safeJSON(item, depth + 1);
    }
  }
  function boundedJSON(value) {
    safeJSON(value);
    if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_BYTES) throw error('资料超过 8 MB，请分开保存');
  }
  async function hashRaw(raw) {
    return dependencies().digest(raw === null ? 'paris-pocket:no-legacy-key' : raw);
  }
  function blankPersonal() {
    return { schemaVersion: 4, revision: 0, notesByActivityId: {}, localTasks: {}, completionByTaskId: {}, archivedSnapshots: {}, legacyArchive: [], legacySourceHash: null, legacySourceHashes: [], migrationStatus: 'pending' };
  }
  function validatePersonal(input) {
    boundedJSON(input);
    if (!record(input) || input.schemaVersion !== 4) throw error('此个人资料版本不受支持，请更新 App');
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw error('个人资料版本号不正确');
    for (const key of ['notesByActivityId', 'localTasks', 'completionByTaskId', 'archivedSnapshots']) {
      if (!record(input[key])) throw error(`${key} 格式不正确`);
      if (Object.keys(input[key]).some(id => !validId(id))) throw error(`${key} 包含无效 ID`);
    }
    if (Object.values(input.notesByActivityId).some(note => typeof note !== 'string' || note.length > 20000)) throw error('活动备注格式不正确（最多 20,000 字）');
    if (Object.values(input.completionByTaskId).some(value => typeof value !== 'boolean')) throw error('任务完成状态格式不正确');
    const localTasks = {};
    for (const [id, task] of Object.entries(input.localTasks)) {
      if (!id.startsWith('local-') || !record(task) || task.id !== id) throw error('本机任务 ID 格式不正确');
      localTasks[id] = dependencies().validateLocalTask(task);
    }
    if (!Array.isArray(input.legacyArchive) || !Array.isArray(input.legacySourceHashes)) throw error('旧资料档案格式不正确');
    for (const item of input.legacyArchive) {
      if (!record(item) || !(item.sourceRaw === null || typeof item.sourceRaw === 'string') || !/^[a-f0-9]{64}$/.test(item.sourceHash || '') || typeof item.migratedAt !== 'string') throw error('旧资料原档案格式不正确');
    }
    if (new Set(input.legacyArchive.map(item => item.sourceHash)).size !== input.legacyArchive.length) throw error('旧资料档案重复');
    if (input.legacySourceHashes.some(hash => !/^[a-f0-9]{64}$/.test(hash)) || new Set(input.legacySourceHashes).size !== input.legacySourceHashes.length) throw error('旧资料恢复记录格式不正确');
    if (input.legacySourceHash !== null && !/^[a-f0-9]{64}$/.test(input.legacySourceHash || '')) throw error('旧资料来源摘要不正确');
    if (!['pending', 'ready', 'blocked'].includes(input.migrationStatus)) throw error('资料恢复状态不正确');
    return { ...clone(input), localTasks };
  }
  async function archiveLegacy(raw, context, kind = 'initial-migration') {
    if (!(raw === null || typeof raw === 'string')) throw error('无法读取旧资料，请先保存原始资料', 'LEGACY_UNREADABLE');
    const result = { sourceKey: LEGACY_KEY, sourceRaw: raw, sourceHash: await hashRaw(raw), sourceSchemaVersion: 'absent', migratedAt: now(), migrationVersion: 1, kind };
    if (context) result.sourceCanonicalHash = await dependencies().digest(JSON.stringify(context));
    if (raw === null) return result;
    try {
      const parsed = JSON.parse(raw);
      result.sourceSchemaVersion = record(parsed) ? (parsed.schemaVersion === undefined ? 'unversioned' : parsed.schemaVersion) : 'invalid';
      boundedJSON(parsed);
      if (!record(parsed)) throw error('旧资料不是对象');
      const personal = root.ParisPersonal;
      if (!personal) throw error('旧资料校验模块尚未载入');
      const normalized = personal.normalize(parsed);
      if (context && root.ParisItinerary) root.ParisItinerary.validate(context, normalized);
      result.data = clone(parsed); // Full source, including unknown nested fields; normalization is validation only.
      if (parsed._tripVersion !== undefined) result.sourceTripVersion = clone(parsed._tripVersion);
    } catch (failure) {
      result.error = failure.message || '无法校验旧资料';
    }
    return result;
  }
  function mergeArchives(current, imported) {
    const byHash = new Map(current.legacyArchive.map(item => [item.sourceHash, item]));
    for (const item of imported.legacyArchive) if (!byHash.has(item.sourceHash)) byHash.set(item.sourceHash, item);
    imported.legacyArchive = [...byHash.values()].map(clone);
    imported.legacySourceHashes = [...new Set([...current.legacySourceHashes, ...imported.legacySourceHashes, ...byHash.keys()])];
    if (current.legacyCanonicalContext && !imported.legacyCanonicalContext) imported.legacyCanonicalContext = clone(current.legacyCanonicalContext);
    if (current.legacyCanonicalHash && !imported.legacyCanonicalHash) imported.legacyCanonicalHash = current.legacyCanonicalHash;
    return imported;
  }
  function checkedManifest(input) {
    boundedJSON(input);
    const manifest = dependencies().manifest(input);
    if (manifest.schemaVersion !== 1 || manifest.tripId !== TRIP_ID || !Number.isSafeInteger(manifest.releaseSequence) || manifest.releaseSequence < 1 || !/^[a-f0-9]{64}$/.test(manifest.sha256) || !Number.isSafeInteger(manifest.byteLength) || manifest.byteLength < 1 || manifest.byteLength > MAX_BYTES) throw error('官方发布清单不正确');
    if (manifest.snapshotUrl !== `./trip/releases/${manifest.sha256}.json`) throw error('官方快照地址不在允许目录内');
    return manifest;
  }
  async function checkEnvelope(envelope, previous) {
    if (!record(envelope)) throw error('缺少官方行程');
    const manifest = checkedManifest(envelope.manifest);
    const text = envelope.text === undefined ? JSON.stringify(envelope.data) : envelope.text;
    if (typeof text !== 'string' || new TextEncoder().encode(text).length !== manifest.byteLength || await dependencies().digest(text) !== manifest.sha256) throw error('官方行程完整性校验失败', 'INTEGRITY_ERROR');
    const parsed = JSON.parse(text);
    boundedJSON(parsed);
    if (envelope.data !== undefined && JSON.stringify(parsed) !== JSON.stringify(envelope.data)) throw error('官方行程内容与校验文本不一致', 'INTEGRITY_ERROR');
    const data = dependencies().validate(parsed, previous);
    if (data.schemaVersion !== 1 || data.tripId !== TRIP_ID || data.tripDataVersion !== manifest.tripDataVersion || data.releaseSequence !== manifest.releaseSequence) throw error('官方行程版本与发布清单不符', 'INTEGRITY_ERROR');
    return { data, manifest, syncedAt: now(), checkedAt: now(), highestSeenSequence: manifest.releaseSequence };
  }
  function txRecords(db, mode, keys, change) {
    return new Promise((resolve, reject) => {
      let transaction, output, failure;
      try {
        transaction = db.transaction(TABLE, mode);
        const table = transaction.objectStore(TABLE), values = {}, count = keys.length;
        let loaded = 0;
        const completeRead = () => {
          try {
            const result = change(values);
            output = result && result.result;
            if (result && result.put) for (const [key, value] of Object.entries(result.put)) table.put(value, key);
          } catch (caught) { failure = caught; transaction.abort(); }
        };
        if (!count) completeRead();
        for (const key of keys) {
          const request = table.get(key);
          request.onsuccess = () => { values[key] = request.result; if (++loaded === count) completeRead(); };
        }
        transaction.oncomplete = () => resolve(output);
        transaction.onerror = () => { failure = failure || transaction.error; };
        transaction.onabort = () => reject(failure || transaction.error || error('资料未能保存', 'STORAGE_FAILED'));
      } catch (caught) { reject(caught); }
    });
  }
  function stateFrom(values) {
    if (!values.personal || !values.current) throw error('本机资料尚未初始化', 'NOT_READY');
    const personal = validatePersonal(values.personal), official = clone(values.current);
    checkedManifest(official.manifest);
    dependencies().validate(official.data);
    if (official.data.tripDataVersion !== official.manifest.tripDataVersion || official.data.releaseSequence !== official.manifest.releaseSequence) throw error('本机官方行程版本不一致', 'INTEGRITY_ERROR');
    let previousAvailable = false;
    if (values.previous) {
      try {
        checkedManifest(values.previous.manifest);
        dependencies().validate(values.previous.data);
        previousAvailable = values.previous.manifest.sha256 !== official.manifest.sha256 && values.previous.manifest.sha256 !== official.rollbackPin?.sha256;
      } catch { /* An unsupported previous release stays preserved, but cannot replace the usable active release. */ }
    }
    return { official, personal, previousAvailable, migrationBlocked: personal.migrationStatus !== 'ready', importUndoAvailable: Boolean(values.importPrevious && values.importPrevious.appliedRevision === personal.revision) };
  }
  const conflict = () => error('另一窗口已更新资料。请重新载入后再保存，当前输入仍可复制。', 'STORAGE_CONFLICT');
  const blocked = () => error('旧资料需要恢复。请先导出原始资料或导入有效备份，当前输入尚未保存。', 'MIGRATION_BLOCKED');
  const allKeys = ['personal', 'current', 'previous', 'importPrevious'];
  function Store(db) { this.db = db; }
  Store.prototype.read = async function () {
    return txRecords(this.db, 'readonly', allKeys, values => ({ result: stateFrom(values) }));
  };
  Store.prototype.initialize = async function (bootstrapEnvelope, legacyRaw) {
    if (!(legacyRaw === null || typeof legacyRaw === 'string')) throw error('旧资料读取失败，未初始化空资料', 'LEGACY_UNREADABLE');
    const bootstrap = await checkEnvelope(bootstrapEnvelope);
    const context = root.PARIS_TRIP ? clone(root.PARIS_TRIP) : null;
    const legacy = await archiveLegacy(legacyRaw, context);
    await txRecords(this.db, 'readwrite', ['personal', 'current'], values => {
      if (values.personal) {
        validatePersonal(values.personal);
        return { put: values.current ? {} : { current: bootstrap } };
      }
      const personal = blankPersonal();
      personal.legacySourceHash = legacy.sourceHash;
      personal.legacySourceHashes = [legacy.sourceHash];
      if (legacyRaw !== null) {
        personal.legacyArchive = [legacy];
        if (context) { personal.legacyCanonicalContext = context; personal.legacyCanonicalHash = legacy.sourceCanonicalHash; }
      }
      personal.migrationStatus = legacy.error ? 'blocked' : 'pending';
      archiveTasks(personal, bootstrap.data, bootstrap.manifest.tripDataVersion);
      return { put: { personal: validatePersonal(personal), current: bootstrap } };
    });
    // IDB transaction completion, then an independent read and hash check, precede the ready flag.
    let state = await this.read();
    await checkEnvelope(state.official);
    for (const item of state.personal.legacyArchive) {
      if (await hashRaw(item.sourceRaw) !== item.sourceHash) throw error('旧资料读回校验失败，未完成迁移', 'INTEGRITY_ERROR');
      if (item.data !== undefined && JSON.stringify(JSON.parse(item.sourceRaw)) !== JSON.stringify(item.data)) throw error('旧资料内容读回校验失败，未完成迁移', 'INTEGRITY_ERROR');
    }
    if (state.personal.legacyCanonicalContext && await dependencies().digest(JSON.stringify(state.personal.legacyCanonicalContext)) !== state.personal.legacyCanonicalHash) throw error('旧行程上下文读回校验失败', 'INTEGRITY_ERROR');
    if (state.personal.migrationStatus === 'pending') {
      const revision = state.personal.revision;
      await txRecords(this.db, 'readwrite', ['personal'], values => {
        const personal = validatePersonal(values.personal);
        if (personal.revision !== revision) throw conflict();
        personal.migrationStatus = 'ready';
        return { put: { personal }, result: null };
      });
    }
    state = await this.read();
    if (legacy.sourceHash !== state.personal.legacySourceHash && !state.personal.legacySourceHashes.includes(legacy.sourceHash)) return this.captureLegacy(legacyRaw);
    return state;
  };
  Store.prototype.changePersonal = async function (expectedRevision, updaterOrNext) {
    await txRecords(this.db, 'readwrite', ['personal'], values => {
      const current = validatePersonal(values.personal);
      if (current.revision !== expectedRevision) throw conflict();
      if (current.migrationStatus !== 'ready') throw blocked();
      const draft = clone(current), returned = typeof updaterOrNext === 'function' ? updaterOrNext(draft) : updaterOrNext;
      if (returned && typeof returned.then === 'function') throw error('资料修改必须在同一事务中完成');
      if (returned !== undefined && !record(returned)) throw error('个人资料修改格式不正确');
      const next = { ...current, ...(returned === undefined ? draft : returned), schemaVersion: 4, revision: current.revision + 1 };
      for (const key of ['legacyArchive', 'legacySourceHash', 'legacySourceHashes', 'legacyCanonicalContext', 'legacyCanonicalHash', 'migrationStatus', 'archivedSnapshots']) {
        if (current[key] !== undefined) next[key] = clone(current[key]);
      }
      return { put: { personal: validatePersonal(next) } };
    });
    return this.read();
  };
  Store.prototype.captureLegacy = async function (raw) {
    const context = root.PARIS_TRIP ? clone(root.PARIS_TRIP) : null;
    const entry = await archiveLegacy(raw, context, 'legacy-tab-recovery');
    await txRecords(this.db, 'readwrite', ['personal'], values => {
      const personal = validatePersonal(values.personal);
      if (personal.legacySourceHashes.includes(entry.sourceHash)) return {};
      personal.legacyArchive.push(entry);
      personal.legacySourceHashes.push(entry.sourceHash);
      personal.legacySourceHash = entry.sourceHash;
      personal.revision++;
      if (context && !personal.legacyCanonicalContext) { personal.legacyCanonicalContext = context; personal.legacyCanonicalHash = entry.sourceCanonicalHash; }
      return { put: { personal: validatePersonal(personal) } };
    });
    return this.read();
  };
  async function getText(url) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await root.fetch(url, { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw error('官方行程暂时无法下载，请稍后重试', 'NETWORK_ERROR');
      const text = await response.text();
      if (new TextEncoder().encode(text).length > MAX_BYTES) throw error('官方行程文件过大');
      return text;
    } finally { clearTimeout(timer); }
  }
  function archiveTasks(personal, data, version, previous) {
    let changed = false;
    for (const task of data.tasks || []) {
      if (task.status !== 'archived') continue;
      const id = task.id || task.taskId;
      if (!validId(id)) throw error('归档任务 ID 格式不正确');
      if (JSON.stringify(personal.archivedSnapshots[id]?.task) === JSON.stringify(task)) continue;
      personal.archivedSnapshots[id] = { task: clone(task), tripDataVersion: version, archivedAt: now() };
      changed = true;
    }
    const retired = new Set(data.retiredActivityIds || []), active = new Set((data.activities || []).map(activity => activity.id));
    for (const activity of previous?.activities || []) {
      if (active.has(activity.id) || !retired.has(activity.id) || personal.archivedSnapshots[activity.id]?.activity) continue;
      personal.archivedSnapshots[activity.id] = { activity: clone(activity), tripDataVersion: previous.tripDataVersion, retiredInVersion: version, archivedAt: now() };
      changed = true;
    }
    if (changed) personal.revision++;
    return changed;
  }
  Store.prototype.sync = async function ({ force = false } = {}) {
    if (typeof force !== 'boolean') throw error('请明确选择是否重试隔离版本');
    const initial = await this.read(), before = initial.official;
    const base = new URL('./', root.location.href), manifestUrl = new URL('./trip/manifest.json', base);
    const rawManifest = await getText(manifestUrl.href);
    if (new TextEncoder().encode(rawManifest).length > 16384) throw error('官方发布清单过大');
    const manifest = checkedManifest(JSON.parse(rawManifest));
    const pin = before.rollbackPin, highest = before.highestSeenSequence || before.manifest.releaseSequence;
    if (pin && manifest.sha256 === pin.sha256 && !force) throw error('此版本已回滚隔离，等待更新版本；可明确选择重试已隔离版本。', 'ROLLBACK_PINNED');
    if (manifest.releaseSequence < highest || (manifest.releaseSequence === before.manifest.releaseSequence && manifest.sha256 !== before.manifest.sha256)) throw error('拒绝过期或冲突的官方发布', 'STALE_RELEASE');
    if (manifest.releaseSequence === highest && manifest.sha256 !== before.manifest.sha256 && !(pin && force && manifest.sha256 === pin.sha256)) throw error('同一发布序号的内容发生变化', 'RELEASE_CONFLICT');
    if (manifest.sha256 === before.manifest.sha256) {
      if (manifest.releaseSequence !== before.manifest.releaseSequence || manifest.tripDataVersion !== before.manifest.tripDataVersion) throw error('官方发布版本与本机内容不一致', 'RELEASE_CONFLICT');
      await txRecords(this.db, 'readwrite', ['current'], values => {
        if (values.current.manifest.sha256 !== before.manifest.sha256) throw conflict();
        return { put: { current: { ...values.current, checkedAt: now() } } };
      });
      return this.read();
    }
    const snapshotUrl = new URL(manifest.snapshotUrl, base);
    if (snapshotUrl.origin !== base.origin || snapshotUrl.pathname !== new URL(`./trip/releases/${manifest.sha256}.json`, base).pathname || snapshotUrl.search || snapshotUrl.hash) throw error('官方快照地址不安全');
    const text = await getText(snapshotUrl.href);
    const next = await checkEnvelope({ manifest, text }, before.data);
    next.highestSeenSequence = Math.max(highest, manifest.releaseSequence);
    await txRecords(this.db, 'readwrite', ['personal', 'current', 'previous'], values => {
      if (values.current.manifest.sha256 !== before.manifest.sha256 || values.current.manifest.releaseSequence !== before.manifest.releaseSequence) throw conflict();
      const personal = validatePersonal(values.personal);
      archiveTasks(personal, next.data, manifest.tripDataVersion, values.current.data);
      return { put: { current: next, previous: values.current, personal: validatePersonal(personal) } };
    });
    return this.read();
  };
  Store.prototype.rollback = async function () {
    const before = await txRecords(this.db, 'readonly', ['current', 'previous'], values => ({ result: clone(values) }));
    if (!before.previous || before.previous.manifest?.sha256 === before.current?.manifest?.sha256 || before.previous.manifest?.sha256 === before.current?.rollbackPin?.sha256) throw error('没有可回滚的官方版本', 'NO_PREVIOUS_RELEASE');
    await checkEnvelope(before.previous); // Re-verify content before a previously stored release is made active.
    await txRecords(this.db, 'readwrite', ['current', 'previous'], values => {
      if (values.current?.manifest?.sha256 !== before.current?.manifest?.sha256 || values.previous?.manifest?.sha256 !== before.previous.manifest.sha256) throw conflict();
      if (!values.previous || values.previous.manifest.sha256 === values.current.manifest.sha256 || values.previous.manifest.sha256 === values.current.rollbackPin?.sha256) throw error('没有可回滚的官方版本', 'NO_PREVIOUS_RELEASE');
      const current = values.current, next = clone(values.previous);
      next.highestSeenSequence = Math.max(current.highestSeenSequence || 0, current.manifest.releaseSequence, next.highestSeenSequence || 0);
      next.rollbackPin = { sha256: current.manifest.sha256, releaseSequence: current.manifest.releaseSequence, rolledBackAt: now() };
      return { put: { current: next, previous: current } };
    });
    return this.read();
  };
  Store.prototype.backup = async function () {
    const state = await this.read();
    return { _format: FORMAT, schemaVersion: 4, tripId: TRIP_ID, personal: clone(state.personal), _date: now(), _tripVersion: state.official.manifest.tripDataVersion };
  };
  async function inspectBackup(payload) {
    boundedJSON(payload);
    if (!record(payload)) throw error('这不是巴黎手帐备份文件');
    let imported, legacy;
    if (payload._format === FORMAT) {
      if (payload.schemaVersion !== 4 || payload.tripId !== TRIP_ID) throw error('备份版本或旅行不兼容');
      imported = validatePersonal(payload.personal);
      // Source hashes are verified before the transaction, without touching existing records.
      for (const item of imported.legacyArchive) if (await hashRaw(item.sourceRaw) !== item.sourceHash) throw error('备份中的旧资料原档案摘要不符', 'INTEGRITY_ERROR');
      for (const item of imported.legacyArchive) if (item.data !== undefined && JSON.stringify(JSON.parse(item.sourceRaw)) !== JSON.stringify(item.data)) throw error('备份中的旧资料与原字符串不符', 'INTEGRITY_ERROR');
      if (imported.legacyCanonicalContext && await dependencies().digest(JSON.stringify(imported.legacyCanonicalContext)) !== imported.legacyCanonicalHash) throw error('备份中的旧行程上下文摘要不符', 'INTEGRITY_ERROR');
    } else if (payload._format === 'paris-pocket-backup-v1') {
      legacy = await archiveLegacy(JSON.stringify(payload), root.PARIS_TRIP || null, 'legacy-backup-import');
      if (legacy.error) throw error(legacy.error);
    } else throw error('这不是巴黎手帐备份文件');
    return { kind: imported ? 'v2' : 'v1', ...(imported ? { personal: imported } : { legacy }), counts: { notes: Object.keys(imported?.notesByActivityId || {}).length, localTasks: Object.keys(imported?.localTasks || {}).length, completion: Object.values(imported?.completionByTaskId || {}).filter(Boolean).length, legacyArchives: imported ? imported.legacyArchive.length : 1 } };
  }
  Store.prototype.restoreBackup = async function (payload, expectedRevision) {
    const inspected = await inspectBackup(payload), imported = inspected.personal, legacy = inspected.legacy;
    await txRecords(this.db, 'readwrite', ['personal', 'importPrevious'], values => {
      const current = validatePersonal(values.personal);
      if (current.revision !== expectedRevision) throw conflict();
      let next;
      if (imported) next = mergeArchives(current, clone(imported));
      else {
        next = clone(current);
        if (!next.legacySourceHashes.includes(legacy.sourceHash)) { next.legacyArchive.push(legacy); next.legacySourceHashes.push(legacy.sourceHash); }
        next.migrationStatus = 'ready'; // A valid, explicitly chosen recovery source unblocks new personal notes.
        if (root.PARIS_TRIP && !next.legacyCanonicalContext) { next.legacyCanonicalContext = clone(root.PARIS_TRIP); next.legacyCanonicalHash = legacy.sourceCanonicalHash; }
      }
      next.revision = current.revision + 1;
      return { put: { personal: validatePersonal(next), importPrevious: { personal: current, appliedRevision: next.revision, importedAt: now() } } };
    });
    return this.read();
  };
  Store.prototype.undoImport = async function (expectedRevision) {
    await txRecords(this.db, 'readwrite', ['personal', 'importPrevious'], values => {
      const current = validatePersonal(values.personal), checkpoint = values.importPrevious;
      if (current.revision !== expectedRevision) throw conflict();
      if (!checkpoint || checkpoint.appliedRevision !== current.revision) throw error('导入后已有新修改，不能直接撤销以免丢失资料', 'IMPORT_UNDO_CONFLICT');
      const next = mergeArchives(current, validatePersonal(checkpoint.personal));
      next.revision = current.revision + 1;
      return { put: { personal: validatePersonal(next), importPrevious: { personal: current, appliedRevision: null, undoneAt: now() } } };
    });
    return this.read();
  };
  Store.prototype.close = function () { this.db.close(); };
  function open() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(error('此浏览器无法使用本机资料库，资料尚未保存', 'STORAGE_UNAVAILABLE'));
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      let rejected = false;
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(TABLE)) request.result.createObjectStore(TABLE); };
      request.onblocked = () => { rejected = true; reject(error('请关闭其他旧版巴黎手帐窗口后重试', 'DATABASE_BLOCKED')); };
      request.onerror = () => reject(request.error || error('本机资料库无法开启', 'STORAGE_UNAVAILABLE'));
      request.onsuccess = () => {
        const db = request.result;
        if (rejected) { db.close(); return; }
        db.onversionchange = () => db.close();
        resolve(new Store(db));
      };
    });
  }
  const api = { DB_NAME, DB_VERSION, FORMAT, open, validatePersonal, blankPersonal, archiveLegacy, safeJSON, checkEnvelope, inspectBackup };
  root.ParisStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

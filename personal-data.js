/* Additive schema: keep the production key and preserve fields from older versions. */
(function (root) {
  'use strict';
  const KEY = 'paris-pocket-personal-v1';
  const FORMAT = 'paris-pocket-backup-v1';
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function stringMap(value, name) {
    if (!isRecord(value) || Object.values(value).some(item => typeof item !== 'string')) {
      throw new Error(`${name} 格式不正确`);
    }
    return { ...value };
  }
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(id) && !['constructor', 'prototype'].includes(id);
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function idList(value, name) {
    if (!Array.isArray(value) || value.some(id => !validId(id)) || new Set(value).size !== value.length) throw new Error(`${name} 格式不正确`);
    return [...value];
  }
  function validateEdit(edit) {
    if (!isRecord(edit) || typeof edit.time !== 'string' || !edit.time.trim() || edit.time.length > 64 ||
        typeof edit.end !== 'string' || edit.end.length > 64 ||
        typeof edit.detail !== 'string' || edit.detail.length > 5000) {
      throw new Error('活动修改格式不正确');
    }
    // Flexible labels such as 晚上 and 约19:00 remain valid planning data.
    for (const value of [edit.time.trim(), edit.end.trim()]) {
      if (/^\d{1,2}:\d{2}$/.test(value) && !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
        throw new Error('时间需在 00:00–23:59 之间');
      }
    }
    const time = edit.time.trim(), end = edit.end.trim();
    const clock = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;
    const minutes = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    if (clock.test(time) && clock.test(end) && minutes(end) < minutes(time)) {
      throw new Error('结束时间不能早于开始时间（同一天）');
    }
    const result = { time, end, detail: edit.detail };
    if (edit.title !== undefined) {
      if (typeof edit.title !== 'string' || !edit.title.trim() || edit.title.length > 200) throw new Error('请填写活动名称（最多 200 字）');
      result.title = edit.title.trim();
    }
    if (edit.date !== undefined) {
      if (!validDate(edit.date)) throw new Error('活动日期格式不正确');
      result.date = edit.date;
    }
    return result;
  }
  function normalize(data) {
    if (!isRecord(data)) throw new Error('个人数据格式不正确');
    if (data.schemaVersion !== undefined && data.schemaVersion !== 1 && data.schemaVersion !== 2 && data.schemaVersion !== 3) {
      throw new Error('此数据来自较新版本，请先更新 App');
    }
    const result = { ...data, schemaVersion: 3 };
    result.booked = data.booked === undefined ? [] : data.booked;
    if (!Array.isArray(result.booked) || result.booked.some(id => typeof id !== 'string')) throw new Error('预约状态格式不正确');
    result.booked = [...result.booked];
    result.dayNotes = stringMap(data.dayNotes === undefined ? {} : data.dayNotes, '每日笔记');
    result.bookingNotes = stringMap(data.bookingNotes === undefined ? {} : data.bookingNotes, '预约笔记');
    for (const key of ['hotelNote', 'flightNote', 'miscNote']) {
      result[key] = data[key] === undefined ? '' : data[key];
      if (typeof result[key] !== 'string') throw new Error('笔记格式不正确');
    }
    if (data.activityOverrides !== undefined && !isRecord(data.activityOverrides)) throw new Error('活动修改格式不正确');
    result.activityOverrides = Object.fromEntries(Object.entries(data.activityOverrides ?? {}).map(([id, edit]) => {
      if (!validId(id)) throw new Error('活动 ID 格式不正确');
      return [id, validateEdit(edit)];
    }));
    if (data.customActivities !== undefined && !isRecord(data.customActivities)) throw new Error('新增活动格式不正确');
    result.customActivities = Object.fromEntries(Object.entries(data.customActivities ?? {}).map(([id, activity]) => {
      const edit = validateEdit(activity);
      if (!validId(id) || !id.startsWith('user-') || activity.id !== id || !edit.title || !edit.date || activity.type !== '生活') throw new Error('新增活动格式不正确');
      return [id, { id, ...edit, type: '生活' }];
    }));
    result.deletedActivityIds = idList(data.deletedActivityIds === undefined ? [] : data.deletedActivityIds, '已删除活动');
    if (data.activityOrder !== undefined && !isRecord(data.activityOrder)) throw new Error('活动顺序格式不正确');
    result.activityOrder = Object.fromEntries(Object.entries(data.activityOrder ?? {}).map(([date, ids]) => {
      if (!validDate(date)) throw new Error('活动顺序日期格式不正确');
      return [date, idList(ids, '活动顺序')];
    }));
    return result;
  }
  function read(storage) {
    let raw = null;
    try { raw = storage.getItem(KEY); return { data: normalize(JSON.parse(raw ?? '{}')), raw, error: null }; }
    catch (error) { return { data: normalize({}), raw, error }; }
  }
  function write(storage, data, expectedRaw) {
    const next = normalize(data);
    if (expectedRaw !== undefined && storage.getItem(KEY) !== expectedRaw) {
      const error = new Error('另一窗口已更新数据。请先导出当前备份并重新载入，再继续编辑。');
      error.code = 'STORAGE_CONFLICT'; throw error;
    }
    storage.setItem(KEY, JSON.stringify(next)); // Throws before callers commit UI state.
    return next;
  }
  function backup(data, tripVersion) {
    return { ...normalize(data), _format: FORMAT, _date: new Date().toISOString(), _tripVersion: tripVersion };
  }
  function restore(payload, current) {
    if (!isRecord(payload) || payload._format !== FORMAT) throw new Error('这不是巴黎手帐备份文件');
    const next = normalize(payload);
    // Legacy backups cannot contain edits: keep current edits instead of silently deleting them.
    const previous = normalize(current);
    if ((payload.schemaVersion ?? 1) < 3) {
      // Older backups merge their supported edits, preserving date moves and V1.1 management.
      next.activityOverrides = { ...previous.activityOverrides };
      for (const [id, edit] of Object.entries(normalize(payload).activityOverrides)) {
        next.activityOverrides[id] = { ...previous.activityOverrides[id], ...edit };
      }
      next.customActivities = previous.customActivities;
      next.deletedActivityIds = previous.deletedActivityIds;
      next.activityOrder = previous.activityOrder;
    }
    for (const key of ['_format', '_date', '_tripVersion']) delete next[key];
    return next;
  }
  const api = { KEY, normalize, validateEdit, read, write, backup, restore };
  root.ParisPersonal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

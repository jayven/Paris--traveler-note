/* Pure activity operations. Canonical trip facts and booking references remain untouched. */
(function (root) {
  'use strict';
  const personal = root.ParisPersonal || require('./personal-data.js');
  function all(trip, data) {
    return trip.days.flatMap(day => day.activities.map(activity => ({ ...activity, date: day.date, ...data.activityOverrides[activity.id] })))
      .concat(Object.values(data.customActivities).map(activity => ({ ...activity, ...data.activityOverrides[activity.id] })));
  }
  function validate(trip, data) {
    const next = personal.normalize(data), dates = new Set(trip.days.map(day => day.date));
    for (const activity of all(trip, next)) {
      if (!dates.has(activity.date)) throw new Error('活动日期必须在本次旅行日期内');
    }
    return next;
  }
  function days(trip, data) {
    const activities = all(trip, data), deleted = new Set(data.deletedActivityIds);
    return trip.days.map(day => {
      const order = new Map((data.activityOrder[day.date] || []).map((id, i) => [id, i]));
      return { ...day, activities: activities.filter(activity => activity.date === day.date && !deleted.has(activity.id))
        .sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity)) };
    });
  }
  function find(trip, data, id) { return all(trip, data).find(activity => activity.id === id); }
  function idsFor(trip, data, date) { return days(trip, data).find(day => day.date === date).activities.map(activity => activity.id); }
  function putOrder(trip, data, date, ids) {
    const expected = idsFor(trip, data, date);
    if (ids.length !== expected.length || new Set(ids).size !== ids.length || ids.some(id => !expected.includes(id))) throw new Error('活动顺序不完整');
    data.activityOrder = { ...data.activityOrder, [date]: ids };
  }
  function edit(trip, data, id, fields, create = false) {
    const next = validate(trip, data), before = find(trip, next, id), change = personal.validateEdit(fields);
    if (!change.title || !change.date || !trip.days.some(day => day.date === change.date)) throw new Error('请选择旅行日期并填写活动名称');
    if (create) {
      if (before) throw new Error('活动 ID 已存在');
      next.customActivities[id] = { id, ...change, type: '生活' };
    } else {
      if (!before || next.deletedActivityIds.includes(id)) throw new Error('活动不存在或已删除');
      if (next.customActivities[id]) { next.customActivities[id] = { ...next.customActivities[id], ...change }; delete next.activityOverrides[id]; }
      else next.activityOverrides[id] = change;
    }
    // A date move/new activity appends to the destination and preserves both days' chosen order.
    if (create || before.date !== change.date) {
      if (before) putOrder(trip, next, before.date, idsFor(trip, data, before.date).filter(item => item !== id));
      putOrder(trip, next, change.date, [...idsFor(trip, data, change.date).filter(item => item !== id), id]);
    }
    return validate(trip, next);
  }
  function reset(trip, data, id) {
    const next = validate(trip, data), before = find(trip, next, id);
    if (!before || next.customActivities[id]) throw new Error('新增活动没有原始行程版本');
    delete next.activityOverrides[id];
    const after = find(trip, next, id);
    if (before.date !== after.date && !next.deletedActivityIds.includes(id)) {
      putOrder(trip, next, before.date, idsFor(trip, data, before.date).filter(item => item !== id));
      putOrder(trip, next, after.date, [...idsFor(trip, data, after.date).filter(item => item !== id), id]);
    }
    return next;
  }
  function remove(trip, data, id) {
    const next = validate(trip, data);
    if (!find(trip, next, id)) throw new Error('活动不存在');
    next.deletedActivityIds = [...new Set([...next.deletedActivityIds, id])];
    return next; // Keep the record and links so deletion is recoverable.
  }
  function restore(trip, data, id) {
    const next = validate(trip, data);
    next.deletedActivityIds = next.deletedActivityIds.filter(item => item !== id);
    return next;
  }
  function reorder(trip, data, id, direction) {
    const next = validate(trip, data), activity = find(trip, next, id);
    if (!activity || next.deletedActivityIds.includes(id) || ![-1, 1].includes(direction)) throw new Error('无法调整活动顺序');
    const ids = idsFor(trip, next, activity.date), index = ids.indexOf(id), to = index + direction;
    if (to < 0 || to >= ids.length) return next;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    putOrder(trip, next, activity.date, ids);
    return next;
  }
  const api = { all, validate, days, find, edit, reset, remove, restore, reorder };
  root.ParisItinerary = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

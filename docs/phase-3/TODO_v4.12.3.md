# Official To-do v4.12.3

The user's November 12, 2026 preparation list is the source for this update. Data schema remains 1; official version is `4.12.3`, release sequence `3`. Exactly ten active official tasks are arranged as seven in `现在｜11/12–11/25` and three in `临近出发｜12/6–12/8`, preserving the supplied Chinese titles and order.

`taskGroups` explicitly records each group's ID, display title, order and recommended `windowStart`/`windowEnd`. Active tasks carry `groupId` and within-group `order`. These windows are recommendations, not deadlines: every official `dueDate` remains null. No completion or booking confirmation is set by this content release.

## Stable task identities

Three underlying checking/confirmation actions retain their IDs and existing on-device completion state:

| Task ID | Current action |
| --- | --- |
| `task-louvre-guide` | Contact the Chinese private guide about the December 11 target time, tickets and rooms. |
| `task-cruise` | Decide the preferred Monday cruise product/time/pier. The existing Thursday backup remains a related activity, not a second cruise task. |
| `task-notredame` | Check December 8 free reservation and religious-observance visitor access. |

Seven purchase/booking/decision actions receive new IDs. A completed former verification task cannot falsely complete a new purchase:

| New active ID | Superseded verification ID(s) | Current association |
| --- | --- | --- |
| `task-opera-tickets` | `task-opera` | Garnier, December 9 |
| `task-versailles-passport` | `task-versailles` | Versailles, December 10 |
| `task-sainte-booking` | `task-sainte` | Sainte-Chapelle, December 8 |
| `task-photoshoot-booking` | `task-photoshoot` | Eiffel photoshoot, December 12 |
| `task-carte-blanche-duo` | `task-orangerie`, `task-orsay` | One purchase task linked from both Orsay and Orangerie; no separate confirmed reservations implied |
| `task-eurostar-tickets` | `task-eurostar` | Paris–Rotterdam outbound and return, December 13 |
| `task-rotterdam-attraction-tickets` | `task-rotterdam-venues` | Fenix and Kinderdijk decision, December 13 |

All eleven superseded or removed old records remain in `tasks` with `status: archived` and an `archiveReason`; their prior title, notes, date/activity association and other fields are preserved. In addition to the eight superseded records above, `task-watershuttle`, `task-orsay-lunch` and `task-flight` are archived because they are absent from the requested ten-task list. Their historical completion flags remain separate and recoverable through the Archived filter. No old ID is reassigned to another action, and no personal data is rewritten.

Activity `taskIds` now point to the relevant current task definitions. Removed verification actions are not offered as active work inside activity details. Carte Blanche uses one stable task identity with links from both museums; its primary task association is Orsay on December 8. Existing activity IDs, titles, time labels, booking statuses, places, Stop identities, hotel stays and route geometry remain unchanged.

The existing route validator requires every segment's packaging `routeDataVersion` to equal the official trip version, so this metadata alone advances to `4.12.3` in source and overrides. No transport mode, coordinate, road vertex or provenance is changed. Earlier immutable releases must remain available in the public build.

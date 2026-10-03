# API Contract — Phase 1–2 (Foundation + R&D)

> Single source of truth shared by `backend/` (Go) and `frontend/` (React).
> Base path: `/api/v1`. All JSON uses **camelCase**. IDs are **UUID v7** strings.
> Timestamps: RFC3339 UTC (`2026-10-03T14:00:00Z`). **Date-only** fields: `YYYY-MM-DD` (no time, no TZ).
> Decimal quantities are JSON **numbers**.

---

## 0. Conventions

### Success envelope
```json
{ "data": { ... } }
```
List endpoints:
```json
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 134, "totalPages": 7 } }
```
List query params (all optional): `page` (default 1), `pageSize` (default from config, max from config), `q` (text search), `sort` (e.g. `-createdAt`, `name`). Unknown sort fields → `400 VALIDATION_FAILED`.

### Error envelope
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "human readable (english, for logs)",
    "details": [ { "field": "steps[0].temperatureC", "code": "min", "param": "0" } ],
    "requestId": "01J..."
  }
}
```
FE translates by `error.code` (and `details[].code`) via i18n — **never show `message` directly**.

| HTTP | code |
|---|---|
| 400 | `VALIDATION_FAILED`, `BAD_REQUEST`, `INVALID_STATE_TRANSITION` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT`, `VERSION_CONFLICT` (optimistic lock), `DUPLICATE` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL` |

### Headers
- `Authorization: Bearer <accessToken>` on every endpoint except `/auth/login`, `/auth/refresh`, `/healthz`, `/readyz`.
- `X-Request-ID` is echoed back (generated if missing).
- `Accept-Language: th|en` (optional, used for server-side defaults only).

### Optimistic locking
Mutable aggregates expose `"version": <int>`. Updates (`PUT`) must send the `version` they read; mismatch → `409 VERSION_CONFLICT`.

### Localized names
Master data uses `nameTh` + `nameEn`. FE picks by current locale (fallback to the other).

---

## 1. Auth & Identity

Refresh token is an **httpOnly, Secure (configurable), SameSite=Strict cookie** (name & path from config, path scoped to `/api/v1/auth`). Access token is returned in the body and kept **in memory only** on the FE.

| Method | Path | Perm | Body / Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ "email", "password" }` → `AuthResult` + sets refresh cookie |
| POST | `/auth/refresh` | cookie | → `AuthResult` (rotates refresh token; reuse of revoked token revokes whole family) |
| POST | `/auth/logout` | auth | revokes refresh token, clears cookie → `204` |
| GET | `/auth/me` | auth | → `Me` |
| PUT | `/auth/me` | auth | `{ "displayName", "locale" }` → `Me` |
| POST | `/auth/me/password` | auth | `{ "currentPassword", "newPassword" }` → `204` |

```ts
type AuthResult = { accessToken: string; tokenType: "Bearer"; expiresIn: number /*sec*/; user: Me }
type Me = { id; email; displayName; locale: "th"|"en"; roles: string[] /*role codes*/; permissions: string[] }
```

### Users / Roles (perm `users.read` / `users.write`)
| Method | Path | Notes |
|---|---|---|
| GET | `/users` | list `User` (q on email/displayName) |
| POST | `/users` | `{ email, displayName, password, locale, roleIds: string[], isActive }` |
| GET | `/users/{id}` | |
| PUT | `/users/{id}` | `{ displayName, locale, roleIds, isActive, version }` |
| POST | `/users/{id}/reset-password` | `{ newPassword }` → 204 |
| GET | `/roles` | `Role[]` (no paging) |
| PUT | `/roles/{id}/permissions` | `{ permissionCodes: string[] }` → `Role` |
| GET | `/permissions` | `Permission[]` |

```ts
type User = { id; email; displayName; locale; isActive: boolean; roles: RoleRef[]; createdAt; updatedAt; version: number }
type RoleRef = { id; code; nameTh; nameEn }
type Role = RoleRef & { permissions: string[] }
type Permission = { code; descriptionTh; descriptionEn; group: string }
```

**Permission codes** (seeded in DB; role ↔ permission mapping is DB data editable via UI):
`users.read users.write masterdata.read masterdata.write settings.read settings.write recipes.read recipes.write recipes.approve trials.read trials.write trials.evaluate files.upload audit.read`

Seeded roles: `OWNER` (all), `MANAGER`, `COOK`, `CASHIER`.

---

## 2. Master Data (perm `masterdata.read` / `masterdata.write`)

All master data entities share: `id, code (UPPER_SNAKE, unique), nameTh, nameEn, sortOrder, isActive, createdAt, updatedAt, version`. `DELETE` is soft-delete (sets deleted_at); referenced rows cannot be hard-removed. Lists support `?includeInactive=true` and `?all=true` (no paging, for dropdowns).

### 2.1 Units — `/units`
```ts
type Unit = Base & { symbol: string; dimension: "MASS"|"VOLUME"|"COUNT"|"TEMPERATURE"|"TIME"|"LENGTH"; baseUnitId: string|null; factorToBase: number }
```
e.g. `G` (base, factor 1), `KG` (base G, factor 1000), `ML`, `L`, `PCS`, `TBSP`, `TSP`, `CELSIUS`, `MINUTE`.
> `dimension` is a fixed physical classification (code enum), not business data.

### 2.2 Taste attributes — `/taste-attributes`
```ts
type TasteAttribute = Base & { descriptionTh: string|null; descriptionEn: string|null; minScore: number; maxScore: number; color: string /* hex for charts */ }
```
Seeded: `SOUR` เปรี้ยว, `SWEET` หวาน, `SPICY` เผ็ด, `SALTY` เค็ม, `UMAMI` นัว, `CRISPINESS` ความกรอบ, `TENDERNESS` ความนุ่มของเนื้อ, `AROMA` กลิ่น — all `minScore 1, maxScore 5`.

### 2.3 Process step types — `/process-step-types`
```ts
type ProcessStepType = Base & {
  icon: string|null;              // lucide icon name
  usesTemperature: boolean;       // show temperatureC input
  usesDuration: boolean;          // show durationMinutes input
  usesOrientation: boolean;       // show orientation (lookup PIG_ORIENTATION)
  isRepeatable: boolean;          // UI labels consecutive steps as "round N" (e.g. frying)
  paramSchema: ParamField[];      // extra dynamic fields stored in step.params
}
type ParamField = { key: string; labelTh: string; labelEn: string; type: "number"|"text"|"boolean"|"lookup"; lookupCategory?: string; unitCode?: string; required: boolean; min?: number; max?: number }
```
Seeded: `PREP` เตรียม, `BOIL` ต้ม/ลวก, `SCORE_SKIN` จิ้มหนัง, `MARINATE` หมัก, `DRY` ตาก/พักให้แห้ง, `STEAM` นึ่ง, `BAKE` อบ, `FRY` ทอด (temperature+duration+orientation, repeatable, paramSchema: `oilType` lookup OIL_TYPE), `REST` พัก, `CUT` หั่น.

### 2.4 Generic lookups
| Method | Path | Notes |
|---|---|---|
| GET | `/lookup-categories` | `LookupCategory[]` |
| GET | `/lookups?category=PIG_ORIENTATION` | `Lookup[]` |
| POST/PUT/DELETE | `/lookups`, `/lookups/{id}` | body includes `category` on POST |

```ts
type LookupCategory = { code; nameTh; nameEn; isSystem: boolean }
type Lookup = Base & { category: string; metadata: Record<string, unknown> }
```
Seeded categories & values:
- `PIG_ORIENTATION`: `SKIN_UP` หนังหงายขึ้น, `SKIN_DOWN` หนังคว่ำลง, `SIDE` ตะแคง, `FLIP` พลิกกลับไปมา
- `OIL_TYPE`: `PALM` น้ำมันปาล์ม, `SOYBEAN` ถั่วเหลือง, `RICE_BRAN` รำข้าว, `LARD` น้ำมันหมู
- `WEATHER`: `SUNNY` แดดจัด, `CLOUDY` ครึ้ม, `RAINY` ฝนตก, `HUMID` ชื้น
- `INGREDIENT_CATEGORY`: `MEAT` เนื้อสัตว์, `SEASONING` เครื่องปรุง, `SPICE` เครื่องเทศ, `OIL` น้ำมัน, `SAUCE` ซอส/น้ำจิ้ม, `PACKAGING` บรรจุภัณฑ์, `OTHER`
- `RECIPE_TAG`: `MAIN` สูตรหลัก, `DIPPING_SAUCE` น้ำจิ้ม, `EXPERIMENT` ทดลอง

### 2.5 Ingredients — `/ingredients`
```ts
type Ingredient = Base & { categoryId: string|null; category: LookupRef|null; defaultUnitId: string; defaultUnit: UnitRef; notes: string|null }
type LookupRef = { id; code; nameTh; nameEn }
type UnitRef = { id; code; symbol; nameTh; nameEn }
```
Filters: `?categoryId=`.

### 2.6 App settings (perm `settings.*`)
| GET | `/settings` | `Setting[]` |
| PUT | `/settings/{key}` | `{ value, version }` |
```ts
type Setting = { key: string; value: unknown; valueType: "string"|"number"|"boolean"|"json"; descriptionTh; descriptionEn; isPublic: boolean; version: number; updatedAt }
```
Seeded: `shop.name` ("หมูกรอบ มี จำกัด"), `shop.currency` ("THB"), `shop.timezone` ("Asia/Bangkok"), `trial.passScoreThreshold` (4.0), `trial.defaultTasterName` ("").
`GET /settings/public` (auth only, no perm) → only `isPublic=true`.

---

## 3. Recipes (perm `recipes.read` / `recipes.write` / `recipes.approve`)

A recipe has many **immutable versions**. Editing content = creating a new version (`currentVersionId` moves). Metadata (name/description/tags) is editable in place.

Status machine (domain enum): `DRAFT → TESTING → APPROVED → ARCHIVED`; also `TESTING → DRAFT`, `APPROVED → TESTING`, `ARCHIVED → DRAFT`. `APPROVED` requires `recipes.approve`. Invalid → `400 INVALID_STATE_TRANSITION`.

| Method | Path | Body / Response |
|---|---|---|
| GET | `/recipes?q&status&tagId` | `RecipeSummary[]` |
| POST | `/recipes` | `{ code?, name, description?, tagIds: string[], initialVersion: RecipeVersionInput }` → `RecipeDetail` (code auto-generated if empty, pattern from config `RECIPE_CODE_PREFIX` + running no.) |
| GET | `/recipes/{id}` | `RecipeDetail` |
| PUT | `/recipes/{id}` | `{ name, description, tagIds, version }` → `RecipeDetail` |
| DELETE | `/recipes/{id}` | 204 (soft) |
| POST | `/recipes/{id}/status` | `{ status, version }` → `RecipeDetail` |
| GET | `/recipes/{id}/versions` | `RecipeVersionSummary[]` (no paging, desc) |
| POST | `/recipes/{id}/versions` | `RecipeVersionInput` → `RecipeDetail` (new current version) |
| GET | `/recipes/{id}/versions/{versionId}` | `RecipeVersion` |
| POST | `/recipes/{id}/versions/{versionId}/restore` | copies that version as a new version → `RecipeDetail` |
| GET | `/recipes/{id}/score-trend` | `ScoreTrendPoint[]` |

```ts
type RecipeStatus = "DRAFT"|"TESTING"|"APPROVED"|"ARCHIVED"
type RecipeSummary = { id; code; name; description; status: RecipeStatus; tags: LookupRef[]; currentVersionNo: number; trialCount: number; latestTrialDate: string|null; bestOverallScore: number|null; coverUrl: string|null; createdAt; updatedAt; version }
type RecipeDetail = Omit<RecipeSummary,"currentVersionNo"> & { currentVersion: RecipeVersion; createdBy: UserRef }
type UserRef = { id; displayName }

type RecipeVersionInput = {
  changeNote: string|null;
  inputQuantity: number|null; inputUnitId: string|null;          // e.g. 1 KG raw pork belly
  expectedOutputQuantity: number|null; expectedOutputUnitId: string|null; // e.g. 650 G crispy pork
  notes: string|null;
  ingredients: RecipeIngredientInput[];   // min 0
  steps: ProcessStepInput[];              // min 0, order = array order
}
type RecipeIngredientInput = { ingredientId: string; quantity: number; unitId: string; preparationNote: string|null; isOptional: boolean }
type ProcessStepInput = {
  stepTypeId: string; title: string|null; instruction: string|null;
  temperatureC: number|null; durationMinutes: number|null; orientationId: string|null;
  params: Record<string, unknown>;        // validated against stepType.paramSchema
  notes: string|null;
}
type RecipeVersion = {
  id; recipeId; versionNo: number; changeNote; inputQuantity; inputUnit: UnitRef|null; expectedOutputQuantity; expectedOutputUnit: UnitRef|null;
  expectedYieldPct: number|null;  // computed when units comparable
  notes; ingredients: RecipeIngredient[]; steps: ProcessStep[]; createdBy: UserRef; createdAt
}
type RecipeVersionSummary = { id; versionNo; changeNote; ingredientCount; stepCount; trialCount; createdBy: UserRef; createdAt }
type RecipeIngredient = { id; lineNo; ingredient: { id; code; nameTh; nameEn }; quantity; unit: UnitRef; preparationNote; isOptional }
type ProcessStep = { id; stepNo: number; roundNo: number|null /* nth consecutive of repeatable type */; stepType: { id; code; nameTh; nameEn; icon; isRepeatable }; title; instruction; temperatureC; durationMinutes; orientation: LookupRef|null; params; notes }
type ScoreTrendPoint = { trialId; trialNo; trialDate; versionNo; overallScore: number|null; scores: { tasteAttributeId: string; average: number }[] }
```
Validation: `temperatureC` within config `PROCESS_TEMP_MIN_C..PROCESS_TEMP_MAX_C`, `durationMinutes > 0`, quantities `> 0`, step type flags respected (e.g. temperature rejected if `usesTemperature=false` → `details.code = "not_allowed"`).

---

## 4. Trials — ผลทดสอบ (perm `trials.read` / `trials.write` / `trials.evaluate`)

`trialNo` is a running number **per recipe** (1,2,3…) assigned by server in a transaction.
`trialDate` is **date-only**.

Outcome (domain enum): `PENDING | PASSED | NEEDS_ADJUSTMENT | FAILED`.

| Method | Path | Body / Response |
|---|---|---|
| GET | `/trials?recipeId&outcome&dateFrom&dateTo&q` | `TrialSummary[]` (default sort `-trialDate,-trialNo`) |
| POST | `/trials` | `TrialInput` (+ `recipeId`, `recipeVersionId`). If `ingredients`/`steps` omitted (null) → copied from the recipe version → `TrialDetail` |
| GET | `/trials/{id}` | `TrialDetail` |
| PUT | `/trials/{id}` | `TrialInput & { version }` (replaces steps/ingredients) → `TrialDetail` |
| DELETE | `/trials/{id}` | 204 |
| POST | `/trials/{id}/outcome` | `{ outcome, version }` → `TrialDetail` |
| POST | `/trials/{id}/evaluations` | `EvaluationInput` → `TrialDetail` (perm `trials.evaluate`) |
| PUT | `/trials/{id}/evaluations/{evaluationId}` | `EvaluationInput` → `TrialDetail` |
| DELETE | `/trials/{id}/evaluations/{evaluationId}` | → `TrialDetail` |
| GET | `/trials/compare?ids=a,b,c` | `TrialComparison` (2..config `TRIAL_COMPARE_MAX`) |

```ts
type TrialOutcome = "PENDING"|"PASSED"|"NEEDS_ADJUSTMENT"|"FAILED"
type TrialInput = {
  trialDate: string;              // YYYY-MM-DD, required, not in the future (server TZ from setting/env)
  title: string|null;
  inputQuantity: number|null; inputUnitId: string|null;      // raw weight
  outputQuantity: number|null; outputUnitId: string|null;    // finished weight
  ambientTempC: number|null; humidityPct: number|null; weatherId: string|null;
  summary: string|null;           // รายละเอียดเพิ่มเติม
  issues: string|null;            // ปัญหาที่พบ
  nextActions: string|null;       // สิ่งที่จะปรับรอบหน้า
  ingredients: RecipeIngredientInput[] | null;
  steps: ProcessStepInput[] | null;  // actual process incl. frying rounds (temp/min/orientation)
}
type EvaluationInput = { tasterName: string; overallComment: string|null; scores: { tasteAttributeId: string; score: number /* int within attribute min..max */; comment: string|null }[] }

type TrialSummary = { id; trialNo; trialDate; title; recipe: { id; code; name }; versionNo: number; outcome: TrialOutcome; overallScore: number|null; evaluationCount: number; photoCount: number; coverUrl: string|null; createdAt; version }
type TrialDetail = TrialSummary & {
  recipeVersionId; inputQuantity; inputUnit: UnitRef|null; outputQuantity; outputUnit: UnitRef|null; actualYieldPct: number|null;
  ambientTempC; humidityPct; weather: LookupRef|null; summary; issues; nextActions;
  ingredients: RecipeIngredient[]; steps: ProcessStep[];
  evaluations: Evaluation[];
  averages: { tasteAttributeId: string; code: string; nameTh; nameEn; color; minScore; maxScore; average: number; count: number }[];
  attachments: Attachment[];
  createdBy: UserRef; updatedAt
}
type Evaluation = { id; tasterName; overallComment; scores: { tasteAttributeId; score; comment }[]; average: number; createdBy: UserRef; createdAt }
type TrialComparison = {
  attributes: TasteAttribute[];   // active attributes used in any trial
  trials: (TrialSummary & { steps: ProcessStep[]; ingredients: RecipeIngredient[]; averages: {tasteAttributeId; average}[]; actualYieldPct })[]
}
```
`overallScore` = mean of attribute averages (null if no evaluations). Pass threshold for UI hint comes from setting `trial.passScoreThreshold`.

---

## 5. Attachments (MinIO) — perm `files.upload` for write, owner's read perm for read

| Method | Path | Notes |
|---|---|---|
| POST | `/attachments` | `multipart/form-data`: `file`, `ownerType` (`TRIAL`\|`RECIPE`), `ownerId`, `caption?`, `isCover?` → `Attachment`. Max size `UPLOAD_MAX_BYTES`, allowed MIME `UPLOAD_ALLOWED_MIME_TYPES` (sniffed, not trusted from header). |
| GET | `/attachments?ownerType&ownerId` | `Attachment[]` |
| PATCH | `/attachments/{id}` | `{ caption?, isCover? }` → `Attachment` |
| DELETE | `/attachments/{id}` | 204 (removes object) |

```ts
type Attachment = { id; ownerType; ownerId; fileName; contentType; sizeBytes; caption; isCover: boolean; url: string /* presigned GET, TTL MINIO_PRESIGN_TTL */; createdBy: UserRef; createdAt }
```
Object key: `{ownerType}/{ownerId}/{uuid}{ext}`.

---

## 6. Notifications & WebSocket

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications?unreadOnly=true` | `Notification[]` paged, `-createdAt` |
| GET | `/notifications/unread-count` | `{ count }` |
| POST | `/notifications/{id}/read` | 204 |
| POST | `/notifications/read-all` | 204 |
| POST | `/ws/ticket` | → `{ ticket, expiresIn }` one-time ticket (Redis, TTL `WS_TICKET_TTL`) |
| GET (upgrade) | `/ws?ticket=...` | WebSocket |

```ts
type Notification = { id; type: NotificationType; severity: "INFO"|"SUCCESS"|"WARNING"|"ERROR"; params: Record<string, string|number>; link: string|null /* FE route e.g. /trials/{id} */; readAt: string|null; createdAt }
type NotificationType = "RECIPE_CREATED"|"RECIPE_VERSION_CREATED"|"RECIPE_STATUS_CHANGED"|"TRIAL_CREATED"|"TRIAL_EVALUATED"|"TRIAL_OUTCOME_CHANGED"
```
FE renders text via i18n key `notifications.types.<TYPE>` with `params` interpolation (e.g. `{ recipeName, trialNo, status, outcome, tasterName, score, actorName }`).

### WS messages (server → client), JSON:
```json
{ "type": "notification", "data": Notification }
{ "type": "entity.changed", "data": { "entity": "trial"|"recipe"|"masterdata", "id": "...", "action": "created"|"updated"|"deleted" } }
{ "type": "pong" }
```
Client → server: `{ "type": "ping" }`. Server sends WS ping frames every `WS_PING_INTERVAL`; client reconnects with exponential backoff (FE config) and fetches a new ticket each time.
FE uses `entity.changed` to invalidate TanStack Query caches.

Recipients: users holding the permission related to the entity (`recipes.read` / `trials.read`), excluding the actor. Delivery pipeline: use case writes `outbox_events` in the same TX → outbox dispatcher → creates `notifications` rows + publishes to Redis channel → each API instance's WS hub pushes to connected users.

---

## 7. Ops
| GET | `/healthz` | `{ "status": "ok" }` liveness |
| GET | `/readyz` | `{ "status": "ok", "checks": { "postgres": "ok", "redis": "ok", "minio": "ok" } }` (503 if any fails) |
| GET | `/audit-logs?entityType&entityId&actorId` | perm `audit.read` → `AuditLog[]` |

```ts
type AuditLog = { id; actor: UserRef|null; action: string; entityType: string; entityId: string; before: unknown; after: unknown; requestId; ip; createdAt }
```

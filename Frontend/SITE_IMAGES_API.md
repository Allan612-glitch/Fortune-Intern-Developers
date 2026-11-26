# Site images API

The backend implements these endpoints and serves image bytes from
`SITE_IMAGES_BASE_URL` (the public HTTPS backend origin). Set this environment
variable on the backend and apply the database migrations before using uploads.
Images are stored in the database, up to 2 MiB each. Each replacement gets a
new URL; old URLs stop working after replacement or deletion. The production
backend host is already included in `Frontend/vercel.json`'s `img-src`. If
using a different backend host, add that host to the frontend CSP.

The admin dashboard now has an **Images** tab. Admins upload photos for the
FIN CONNECT cards on the public landing page. If paths or field names change,
the frontend service `src/services/siteImages.ts` must also be updated.

Frontend files: `src/services/siteImages.ts`, `src/components/SiteImagesPanel.tsx`,
`src/components/landing/FinConnectSection.tsx`.

## Slots (fixed list, the only valid values)

| slot                   | Where it shows                    |
| ---------------------- | --------------------------------- |
| `fin-connect-programs` | FIN CONNECT, "Programs & Events"  |
| `fin-connect-guide`    | FIN CONNECT, "Career Guide"       |
| `fin-connect-lab`      | FIN CONNECT, "FIN Developer Lab"  |
| `fin-connect-partners` | FIN CONNECT, "FIN Partners"       |

Unknown slot in the URL: `404` or `422`. One image per slot (a new upload replaces the old one).

## Endpoints

### 1. `GET /api/site-images` (PUBLIC, no login)
The landing page calls this for signed-out visitors.
Response `200`: array, one row per slot that has an image (slots with no image are simply absent):

```json
[
  { "slot": "fin-connect-lab", "url": "https://.../lab-3f9a1c.webp", "updated_at": "2026-11-22T22:40:00Z" }
]
```

### 2. `PUT /api/admin/site-images/{slot}` (ADMIN ONLY)
`multipart/form-data` with one file field named **`file`**.
Response `200`: the same object as above (`slot`, `url`, `updated_at`).
Errors use the usual `{"detail": "message"}` shape (the frontend shows `detail` to the admin).

### 3. `DELETE /api/admin/site-images/{slot}` (ADMIN ONLY)
Response `204`. If there is no image, `204` is fine too.

## Rules the backend must enforce (do not trust the browser)

- Admin-only on PUT and DELETE (same admin check as the other `/api/admin/*` routes).
- Allowed types: JPEG, PNG, WebP. Check the real file content, not just the
  `Content-Type` header or file name.
- Size limit. The frontend already shrinks photos to 1600px wide WebP (usually
  under 400 KB), so a limit of about 2 MB is plenty. Note the backend runs on
  Vercel, which rejects request bodies over about 4.5 MB.
- Write an audit-log entry for upload and delete, like other admin actions.

## `url` must be a full `https://` address and must change on every upload

The browser caches images. If a replacement keeps the same URL, visitors keep
seeing the old photo. Use a new file name per upload (for example add a random
suffix) or add a version query to a public URL. Do not add anything to a
signed/presigned URL on the frontend; the frontend uses `url` exactly as given.

## IMPORTANT: Content Security Policy

The browser will block uploaded photos unless the backend host configured in
`SITE_IMAGES_BASE_URL` is allowed by `img-src`.

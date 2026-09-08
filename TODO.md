# 88-Seven / Gruwcer — Project TODO & Notes

> Last updated: 2025
> Repo: `mojadollc/88Seven` · Branch: `main` · VPS: `/var/www/88-seven`
> Taxi app repo: `mojadollc/taxi-delivery-exicube` · Hosted: `go.gruwcer.com` (Firebase Hosting)

---

## 🔴 MUST DO — Delivery Bridge (Critical)

### 1. Deploy Firebase Cloud Functions
The `gruwcerDeliverySync` function was added to `functions/index.js` but **has not been deployed yet**.
Without this, status changes in the taxi app will NOT sync back to 88-seven orders.

```bash
cd /Users/macbook/Documents/mmojadoo/taxi/taxi-delivery-exicube
firebase deploy --only functions
```

> Requires Firebase CLI installed and logged in (`firebase login`).
> Project: `bitride-41c11`

---

### 2. Set Store Location in Admin Settings
The delivery bridge reads `storeLat` / `storeLng` from `DeliverySettings` as the **pickup point** for drivers.
If these are `0,0` the booking will be created with wrong coordinates.

- Go to `/admin/settings` → **Delivery & Fees** tab → **Store Location**
- Click "📍 Use Current Location" or enter coordinates manually
- Save

---

### 3. Add `.env.local` vars to VPS production environment
These were added locally but are **not on the VPS** yet. SSH in and add them:

```bash
# On VPS: /var/www/88-seven/.env.local  (or ecosystem.config.js env block)

DELIVERY_BRIDGE_SECRET=88seven_delivery_bridge_hmac_2024_gruwcer
NEXT_PUBLIC_APP_URL=https://gruwcer.com
TAXI_FIREBASE_DB_URL=https://bitride-41c11-default-rtdb.firebaseio.com
```

> `NEXT_PUBLIC_APP_URL` is used by the bridge to build the callback URL Firebase calls back on.
> If this is wrong, Firebase will call the wrong domain and status sync will silently fail.

---

### 4. Pull & Restart on VPS
After adding env vars, pull the latest code and restart:

```bash
cd /var/www/88-seven
git pull origin main
pm2 restart all
```

---

## 🟡 SHOULD DO — Improvements

### 5. Change BRIDGE_SECRET to a stronger random value
The current secret `88seven_delivery_bridge_hmac_2024_gruwcer` is readable in this file.
Before going to production with real orders, replace it with a random 32-byte hex string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update in **both** places:
- `.env.local` → `DELIVERY_BRIDGE_SECRET=<new_value>`
- `taxi-delivery-exicube/functions/index.js` → `const BRIDGE_SECRET = '<new_value>'`
- Re-deploy Firebase functions after changing

---

### 6. Firebase RTDB Security Rules
Currently the bridge pushes to `/bookings` using the REST API **without auth** (public write).
Add a rule to restrict unauthenticated writes to only the `gruwcerOrderId` field pattern, or use a Firebase service account token in the bridge POST request.

Minimum rule to add in Firebase Console → Realtime Database → Rules:
```json
{
  "rules": {
    "bookings": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```
Then update `app/api/delivery-bridge/route.ts` to authenticate the REST call using a Firebase service account token.

---

### 7. Handle duplicate bridge pushes
If admin clicks "📦 Ready for Pickup" and then also clicks "🚗 Send to Delivery" manually, two Firebase bookings will be created for the same order. Add a check in the bridge POST to skip if the order notes already contain `FB:`:

```ts
// In route.ts POST handler, before pushing to Firebase:
if (order.notes?.includes('FB:')) {
  return NextResponse.json({ error: 'Already sent to delivery', alreadySent: true }, { status: 409 })
}
```

---

### 8. Show Firebase booking ID on order card in admin
Currently the `fbBookingId` is stored in `order.notes` as `FB:xxxx`.
Consider showing it as a clickable link on the order card in `/admin/orders` so admin can jump directly to the booking in the taxi app dashboard (`go.gruwcer.com/bookings`).

---

## 🟢 DONE — Completed Features

| Feature | Commit | Notes |
|---|---|---|
| White + Teal theme preset | — | `#009689` accent, white header |
| Header text uses `--theme-header-text` on all pages | — | No more hardcoded `text-white` |
| Logo on all pages via `useLogo` hook | — | `h-14` size |
| Grocery vector SVG background | — | `/public/grocery-bg.svg` with fade mask |
| Separate Home / Grocery hero sliders | `8c5280e` | `page` field on `HeroSlide`, two tabs in admin |
| Home hero driven by DB slides | `4f56ec9` | Falls back to static if no slides |
| Delivery bridge — 88-seven ↔ taxi app | `bbc2305` | HMAC-signed webhook, auto + manual trigger |
| `gruwcerDeliverySync` Firebase function | `e26351b` | Watches bookings, calls back on status change |

---

## 📋 Delivery Bridge — How It Works (Reference)

```
Customer places order (88-seven)
        ↓
Admin: confirmed → preparing → ready_for_pickup
        ↓ (auto-trigger OR manual "🚗 Send to Delivery" button)
POST /api/delivery-bridge
        ↓
Firebase /bookings/{id} created
  serviceType: "delivery"
  pickup: store lat/lng (from DeliverySettings)
  drop: customer address + lat/lng
  tripInstructions: "📦 Order #xxxx | item1 x2, item2 x1 | Total: ₱xxx"
  gruwcerOrderId: "<postgres order id>"
        ↓
Driver in taxi app sees 📦 Delivery job, accepts it
        ↓
gruwcerDeliverySync Cloud Function fires on status change
        ↓
GET https://gruwcer.com/api/delivery-bridge?orderId=...&status=ACCEPTED&sig=<hmac>
        ↓
88-seven order status updated + customer notified
```

**Status mapping:**

| Firebase | 88-seven |
|---|---|
| ACCEPTED | rider_accepted |
| STARTED | rider_picked_up |
| REACHED | out_for_delivery |
| COMPLETE | delivered |
| CANCELLED | cancelled |

---

## 🔧 Environment Variables Reference

### 88-seven (`.env.local` on VPS)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
DELIVERY_BRIDGE_SECRET=88seven_delivery_bridge_hmac_2024_gruwcer
NEXT_PUBLIC_APP_URL=https://gruwcer.com
TAXI_FIREBASE_DB_URL=https://bitride-41c11-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sari-pos-88979
XENDIT_SECRET_KEY=...
```

### taxi-delivery-exicube (Firebase Functions — hardcoded in `functions/index.js`)
```js
const GRUWCER_APP_URL = 'https://gruwcer.com';
const BRIDGE_SECRET   = '88seven_delivery_bridge_hmac_2024_gruwcer';
```
> Move to `firebase functions:config:set` for better security in production.

---

## 🗂 Key File Locations

| File | Purpose |
|---|---|
| `app/api/delivery-bridge/route.ts` | Bridge API — push to Firebase (POST), receive callback (GET) |
| `app/api/orders/[id]/route.ts` | Auto-triggers bridge on `ready_for_pickup` |
| `app/admin/orders/page.tsx` | Manual "🚗 Send to Delivery" button |
| `app/admin/settings/page.tsx` | Store location config (used as pickup point) |
| `taxi-delivery-exicube/functions/index.js` | `gruwcerDeliverySync` function at bottom of file |
| `prisma/schema.prisma` | `DeliverySettings` model has `storeLat` / `storeLng` |

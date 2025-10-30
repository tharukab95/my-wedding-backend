# Frontend TODO - SSE Notifications and Matchmaking Integration (Next.js)

## Goals

- Real-time notifications via SSE (replace polling).
- 3-tab notifications UI: Interest Requests, Matches, Sent Requests.
- Accurate unread counts on header icon and per-tab red dots.
- UX flow: accept interest → auto-navigate to matches/[id] and show partner details (photos, horoscope, contact).
- Keep other party's tab badge updated after a match is created.

## Pages/Routes

- `/notifications` (3-tab view)
- `/interest-request/[id]` (detail view + accept/reject)
- `/matches/[id]` (full partner details; reuse `/my-ad` UI with tweaks)

## Phase 1: SSE Client Setup (replace polling)

1. Create `src/lib/sseClient.ts`:

```ts
export type NotificationEvent = {
  type:
    | 'interest_request'
    | 'match_created'
    | 'ad_status_change'
    | 'interest_response'
    | 'connection';
  data: any;
  timestamp: string | Date;
};

export class SSEClient {
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelayMs = 5000;

  onEvent?: (evt: NotificationEvent) => void;
  onOpen?: () => void;
  onError?: (err: any) => void;

  connect() {
    if (this.es) this.disconnect();
    this.es = new EventSource('/api/notifications/stream');

    this.es.onopen = () => {
      this.reconnectAttempts = 0;
      this.onOpen?.();
    };

    this.es.onmessage = (msg) => {
      try {
        const evt: NotificationEvent = JSON.parse(msg.data);
        this.onEvent?.(evt);
      } catch (e) {
        this.onError?.(e);
      }
    };

    this.es.onerror = (e) => {
      this.onError?.(e);
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(), this.reconnectDelayMs);
  }

  disconnect() {
    this.es?.close();
    this.es = null;
  }
}
```

2. Initialize in app layout (client-side) and expose a simple event bus (Zustand/Context) to update badges and lists.

## Phase 2: Header Icon + Unread Counts

- Show total unread badge on the heart icon.
- On click, navigate to `/notifications`.

Endpoints to call at mount and on SSE events:

- GET `/api/unified-notifications/counts`
  - Response:
  ```json
  { "success": true, "data": { "interestRequests": number, "matches": number, "total": number } }
  ```

Update logic:

- On page load and every SSE event, refresh counts via the above endpoint.

## Phase 3: Notifications Page (3 Tabs)

Tabs: Interest Requests, Matches, Sent Requests. Each tab shows a red dot if there are unread items.

Endpoints:

- Interest Requests (received): GET `/api/unified-notifications/interest-requests?page=1&limit=20&includeRead=false`
- Matches: GET `/api/unified-notifications/matches?page=1&limit=20&includeRead=false`
- Sent Requests: GET `/api/matches/sent-interests?page=1&limit=20` (if available; else use your existing endpoint)

Per-tab red dot rule:

- `interest-requests` red if counts.interestRequests > 0
- `matches` red if counts.matches > 0

## Phase 4: Interest Request Detail and Accept/Reject

Route: `/interest-request/[id]`

On open (to clear red dot for that item):

- PUT `/api/unified-notifications/interest-requests/:id/read`

Actions:

- Accept: POST `/api/matches/interests/:id/respond`
  - Body: `{ "status": "accepted" }`
  - Response (on accepted):

  ```json
  {
    "success": true,
    "data": {
      "interestId": "uuid",
      "status": "accepted",
      "respondedAt": "ISO",
      "matchId": "uuid"
    }
  }
  ```

  - Then: navigate to `/matches/[matchId]` immediately.

- Reject: POST `/api/matches/interests/:id/respond`
  - Body: `{ "status": "rejected" }`

SSE effects:

- Recipient sees `match_created` → update Matches tab + auto red dot on the other party.
- Sender sees `interest_response` (accepted) → can navigate to `/matches/[id]`.

## Phase 5: Matches Detail Page

Route: `/matches/[id]`

Get full partner details (one call):

- GET `/api/matches/:matchId/partner-details`
  - Response:
  ```json
  {
    "success": true,
    "data": {
      "matchId": "uuid",
      "partnerAd": { /* full ad fields */ },
      "photoUrls": [ { "id": "uuid", "url": "/api/uploads/photos/...", "isProfilePhoto": true, "displayOrder": 0 } ],
      "horoscopeUrl": { "id": "uuid", "url": "/api/uploads/horoscopes/..." } | null,
      "contactDetails": { "phone": "+94...", "email": "..." } | null,
      "sharedInfo": { "photosShared": boolean, "horoscopeShared": boolean, "contactShared": boolean, "isMutual": boolean },
      "compatibilityScore": number,
      "matchCreatedAt": "ISO",
      "matchExpiresAt": "ISO"
    }
  }
  ```

Mark match notification as read when user views details:

- PUT `/api/unified-notifications/matches/:id/read`

UI:

- Reuse `/my-ad` layout for photos/horoscope/contact blocks.
- Gate sections:
  - Show Photos section only if `sharedInfo.photosShared === true`.
  - Show Horoscope section only if `sharedInfo.horoscopeShared === true`.
  - Show Contact only if `sharedInfo.contactShared === true`.

## Phase 6: Sent Requests Tab

- List interests you sent.
- Endpoint (example): GET `/api/matches/sent-interests?page=1&limit=20`
- Optional states: pending/accepted/rejected.
- No red dot required here per requirement.

## Phase 7: SSE Event Handling → UI Updates

Handle these SSE events globally and update store/state:

- `interest_request`: increment counts.interestRequests and refresh list if on the tab.
- `match_created`: increment counts.matches; if the user is the accepting party, navigate to `/matches/[id]`; the other party sees the red dot on Matches tab.
- `ad_status_change`: show toast and optionally refresh ad state if user is on ad-related pages.
- `interest_response`: sender receives accept/reject event; if accepted, optionally deep-link to `/matches/[id]`.

### Clarification: Event semantics and rejection UX

- `interest_request`
  - Sent to the RECIPIENT when someone expresses interest in their ad.
  - Use to bump the Interest Requests tab unread and optionally show a small toast like "New interest received".

- `match_created`
  - Sent to BOTH parties after the recipient accepts.
  - For the RECIPIENT (who just accepted): you already navigate to `/matches/[id]` after a successful POST respond; you may ignore `match_created` for navigation but still refresh counts.
  - For the SENDER: bump Matches tab unread, optional toast "You have a new match".

- `interest_response`
  - Sent to the SENDER to inform whether their interest was `accepted` or `rejected`.
  - If `status === 'accepted'`: navigate to `/matches/[matchId]`.
  - If `status === 'rejected'`: show top-right snackbar/toast like "Your interest was rejected"; do NOT navigate. Also refresh counts and the Sent Requests tab state.

Pseudo-handlers:

```ts
onEvent(evt) {
  switch (evt.type) {
    case 'interest_request':
      refreshCounts();
      if (isOnTab('interest-requests')) refreshInterestRequests();
      showToast('New interest request', 'info');
      break;
    case 'match_created':
      refreshCounts();
      if (isOnTab('matches')) refreshMatches();
      // If this client was the accepter, you will have already navigated via POST response
      // If this client was the sender, optionally show toast
      showToast('You have a new match', 'success');
      break;
    case 'interest_response':
      refreshCounts();
      if (evt.data?.status === 'accepted' && evt.data?.matchId) {
        router.push(`/matches/${evt.data.matchId}`);
      } else if (evt.data?.status === 'rejected') {
        showToast('Your interest was rejected', 'warning');
        if (isOnTab('sent-requests')) refreshSentRequests();
      }
      break;
    case 'ad_status_change':
      showToast(evt.data?.message ?? 'Ad status updated', 'info');
      break;
  }
}
```

## Phase 8: Fallback Polling (only if SSE down)

- If SSE disconnects and max reconnect attempts reached, start 30s polling:
  - GET `/api/unified-notifications/counts` to keep badges up to date.
  - Optionally poll lists when the tab is active.
- Stop polling when SSE reconnects.

## Phase 9: Edge Cases & UX

- If `/matches/[id]` opened but match is not active → show error and navigate back to `/notifications`.
- If user clicks Accept on the detail page and the server responds with accepted, navigate immediately; do not wait for SSE.
- Optimistically mark interest request as read when opening item detail.

## Exact API Reference Summary

- SSE
  - GET `/api/notifications/stream`
  - GET `/api/notifications/status`

- Counts
  - GET `/api/unified-notifications/counts`

- Interest Requests
  - GET `/api/unified-notifications/interest-requests?page=1&limit=20&includeRead=false`
  - PUT `/api/unified-notifications/interest-requests/:id/read`
  - POST `/api/matches/interests/:id/respond` body: `{ "status": "accepted" | "rejected" }`

- Matches
  - GET `/api/unified-notifications/matches?page=1&limit=20&includeRead=false`
  - PUT `/api/unified-notifications/matches/:id/read`
  - GET `/api/matches/:matchId/partner-details`

- Optional (contact sharing if used)
  - GET `/api/matches/interests/:interestId/shared-info`
  - POST `/api/matches/interests/:interestId/share-contact` body: `{ phone?, email?, address? }`
  - POST `/api/matches/interests/:interestId/share-photos`
  - POST `/api/matches/interests/:interestId/share-horoscope`

## Implementation Checklist

- [ ] Header icon badge wired to `/counts` and SSE events
- [ ] `/notifications` page with 3 tabs and red dots
- [ ] Interest requests list + detail, accept/reject flow
- [ ] Auto-navigation to `/matches/[id]` on accept
- [ ] Matches list + detail with gated sections (photos/horoscope/contact)
- [ ] Mark-as-read calls on open for interest/match items
- [ ] SSE reconnection and fallback polling
- [ ] Toasts for ad status changes
- [ ] Snackbar for mismatch (rejection) on `interest_response.status === 'rejected'`

## Notes

- Static files served under `/api/uploads/...` are already wired from backend.
- Use the same `photo.url` and `horoscopeUrl.url` directly in `<img>`/`<a>` tags.
- Ensure auth token is sent (if your fetch client adds headers) for protected endpoints.

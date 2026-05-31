// src/lib/mixpanel.ts
import mixpanel from "mixpanel-browser";

mixpanel.init("3b1ca8352e026b85f4901668f4b1cd75", {
  autocapture: true,
  record_sessions_percent: 100,
});

export default mixpanel;
import posthog from "posthog-js";

posthog.init(
  "446826",
  {
    api_host: "https://us.i.posthog.com",
  }
);

export default posthog;
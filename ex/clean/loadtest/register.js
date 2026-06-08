// k6 load test. Run with Docker (no local install needed):
//   docker run --rm -i --network host -e BASE_URL=http://localhost:8081 \
//     grafana/k6 run - < loadtest/register.js
//
// Two flows: a read-heavy catalog hit (served by the in-memory cached gateway)
// and an occasional write (register a customer).
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    catalog_reads: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "20s", target: 0 },
      ],
      exec: "browse",
    },
    registrations: {
      executor: "constant-arrival-rate",
      rate: 5,
      timeUnit: "1s",
      duration: "1m50s",
      preAllocatedVUs: 10,
      exec: "register",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{group:::catalog}": ["p(95)<200"],
  },
};

// 8081 = the clean example's docker host port (hexagonal is 8080).
const BASE = __ENV.BASE_URL || "http://localhost:8081";

export function browse() {
  const res = http.get(`${BASE}/api/products/category/c1`, { tags: { group: "catalog" } });
  check(res, { "catalog 200": (r) => r.status === 200 });
  sleep(0.5);
}

export function register() {
  const id = `k6-${__VU}-${__ITER}`;
  const payload = JSON.stringify({ id, email: `${id}@shop.com`, name: "Load Test" });
  const res = http.post(`${BASE}/api/customers`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  check(res, { "register 201/409": (r) => r.status === 201 || r.status === 409 });
}

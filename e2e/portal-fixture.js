const userId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const user = { id: userId, email: "customer@example.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: userId, aud: "authenticated", role: "authenticated", exp: 4102444800 })).toString("base64url"), "test"].join(".");
const session = { access_token: jwt, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user };

async function mockPortal(page, { signedIn = false, admin = false } = {}) {
  if (signedIn) await page.addInitScript((value) => localStorage.setItem("sb-portal-test-auth-token", JSON.stringify(value)), session);
  const calls = [];
  await page.context().route("https://portal-test.supabase.co/**", async (route) => {
    const url = new URL(route.request().url()); calls.push({ path: url.pathname, search: url.search, method: route.request().method() });
    const reply = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.includes("/auth/v1/token")) return reply(session);
    if (url.pathname.includes("/auth/v1/user")) return reply(user);
    if (url.pathname.includes("/rpc/record_document_access")) return reply(1);
    if (url.pathname.includes("/rest/v1/profiles")) {
      const profile = { id: userId, account_id: accountId, full_name: "Example Customer", email: user.email, role: admin ? "admin" : "customer", created_at: user.created_at };
      return reply(url.searchParams.has("id") ? profile : [profile]);
    }
    if (url.pathname.includes("/rest/v1/accounts")) {
      const account = { id: accountId, company_name: "Example Company" };
      return reply(url.searchParams.has("id") ? account : [account]);
    }
    if (url.pathname.includes("/rest/v1/documents")) {
      if (route.request().method() === "POST") return reply(null, 201);
      return reply([{ id: "33333333-3333-4333-8333-333333333333", title: "Project quote.pdf", storage_path: `${accountId}/quote.pdf`, size_bytes: 1024, uploaded_at: user.created_at }]);
    }
    if (url.pathname.includes("/storage/v1/object/sign/") && route.request().method() === "POST") return reply({ signedURL: `/object/sign/partner-docs/${accountId}/quote.pdf?token=test` });
    if (url.pathname.includes("/storage/v1/object/sign/")) return route.fulfill({ contentType: "text/plain", body: "Mock document" });
    if (url.pathname.includes("/storage/v1/object/")) return reply({ Key: "test" });
    return reply({});
  });
  await page.route("https://webforms.pipedrive.com/**", (route) => route.abort());
  return calls;
}


export { mockPortal, user, accountId };

// Feishu open API client — minimal read-only methods needed for wiki ingestion.
// Auth uses tenant_access_token from app_id + app_secret in env.

const BASE = "https://open.feishu.cn/open-apis";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Feishu ${r.status} ${r.statusText} on ${url} :: ${body.slice(0, 200)}`);
  }
  const j = (await r.json()) as { code: number; msg?: string; data?: T };
  if (j.code !== 0) {
    throw new Error(`Feishu code=${j.code} msg=${j.msg ?? "?"} on ${url}`);
  }
  return j.data as T;
}

export async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("FEISHU_APP_ID / FEISHU_APP_SECRET missing in env");
  }
  const r = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const j = (await r.json()) as { code: number; msg: string; tenant_access_token?: string; expire?: number };
  if (j.code !== 0 || !j.tenant_access_token) {
    throw new Error(`tenant_access_token failed: code=${j.code} msg=${j.msg}`);
  }
  cachedToken = {
    token: j.tenant_access_token,
    expiresAt: Date.now() + (j.expire ?? 7200) * 1000,
  };
  return cachedToken.token;
}

async function authedFetch<T>(path: string): Promise<T> {
  const token = await getTenantAccessToken();
  return fetchJson<T>(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface WikiNode {
  node_token: string;
  obj_token: string;
  obj_type: string; // "doc" | "docx" | "sheet" | ...
  parent_node_token?: string;
  title: string;
  has_child: boolean;
}

interface NodeListResp {
  items: WikiNode[];
  page_token?: string;
  has_more: boolean;
}

// List children of a wiki space; pass parentNodeToken to get sub-tree.
export async function listWikiNodes(
  spaceId: string,
  parentNodeToken?: string
): Promise<WikiNode[]> {
  const all: WikiNode[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams();
    params.set("page_size", "50");
    if (parentNodeToken) params.set("parent_node_token", parentNodeToken);
    if (pageToken) params.set("page_token", pageToken);
    const data = await authedFetch<NodeListResp>(
      `/wiki/v2/spaces/${spaceId}/nodes?${params.toString()}`
    );
    all.push(...data.items);
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken);
  return all;
}

// Resolve a "wiki token" (the segment after /wiki/) to its space_id + node so
// we can use it as a root. Falls back to treating input as space_id directly.
export async function resolveWikiToRoot(
  wikiToken: string
): Promise<{ spaceId: string; rootNodeToken?: string }> {
  try {
    const data = await authedFetch<{ node: { space_id: string; node_token: string } }>(
      `/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`
    );
    return { spaceId: data.node.space_id, rootNodeToken: data.node.node_token };
  } catch (err) {
    console.warn(`  resolveWikiToRoot failed for ${wikiToken}: ${(err as Error).message}`);
    return { spaceId: wikiToken };
  }
}

// Pull plain text content of a docx document.
export async function getDocRawContent(docToken: string): Promise<string> {
  try {
    const data = await authedFetch<{ content: string }>(
      `/docx/v1/documents/${docToken}/raw_content`
    );
    return data.content ?? "";
  } catch {
    return "";
  }
}

// Walk wiki tree up to maxDepth (root = depth 0). Returns flat list of doc nodes.
export async function walkWiki(
  spaceId: string,
  rootNodeToken: string | undefined,
  maxDepth: number
): Promise<WikiNode[]> {
  const out: WikiNode[] = [];
  async function recurse(parent: string | undefined, depth: number) {
    if (depth > maxDepth) return;
    const children = await listWikiNodes(spaceId, parent);
    for (const node of children) {
      out.push(node);
      if (node.has_child && depth + 1 <= maxDepth) {
        await recurse(node.node_token, depth + 1);
      }
    }
  }
  await recurse(rootNodeToken, 0);
  return out;
}

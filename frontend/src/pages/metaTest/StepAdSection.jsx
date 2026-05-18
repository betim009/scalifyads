import JsonAccordion from "./JsonAccordion.jsx";
import CollapsibleCard from "./CollapsibleCard.jsx";
import { getBackendBaseUrl } from "../../services/http.js";
import { copyTextToClipboard } from "./metaTestUtils.js";

function escapeShellSingleQuotes(value) {
  return String(value ?? "").replace(/'/g, `'\"'\"'`);
}

export default function StepAdSection({
  createdMetaAdSetId,
  createdMetaAdId,
  adName,
  setAdName,
  adCreativeId,
  setAdCreativeId,
  creativeDraftId,
  setCreativeDraftId,
  creativeDraftOptions,
  metaAdAccountId,
  metaPageId,
  setMetaPageId,
  metaInstagramActorId,
  setMetaInstagramActorId,
  backendHasPageId,
  backendHasInstagramActorId,
  pageValidateLoading,
  pageValidateError,
  pageValidateErrorDetails,
  pageValidateResult,
  onValidatePage,
  creativePublishForce,
  setCreativePublishForce,
  selectedCreativeDraftMetaCreativeId,
  selectedCreativeDraftMetaCreativeIdIsReal,
  canPublishCreative,
  creativeDraftHasUrl,
  creativePublishing,
  onPublishCreative,
  canFetchCreative,
  creativeGetLoading,
  creativeGetResult,
  onFetchCreative,
  previewAdFormat,
  setPreviewAdFormat,
  creativePreviewLoading,
  creativePreviewError,
  creativePreviewErrorDetails,
  creativePreviewResult,
  onFetchCreativePreview,
  adPreviewLoading,
  adPreviewError,
  adPreviewErrorDetails,
  adPreviewResult,
  onFetchAdPreview,
  pagesLoading,
  pagesResult,
  pagesError,
  pagesErrorDetails,
  onListPages,
  canCreateAd,
  adCreating,
  onCreateAd,
  createdGeneratedCampaignId,
  flowMode,
  normalizeNonEmptyString,
}) {
  const effectiveCreativeId =
    normalizeNonEmptyString(adCreativeId) ||
    (selectedCreativeDraftMetaCreativeIdIsReal ? normalizeNonEmptyString(selectedCreativeDraftMetaCreativeId) : null) ||
    null;
  const canUseDraftCreativeId =
    flowMode === "REAL" &&
    normalizeNonEmptyString(creativeDraftId) &&
    selectedCreativeDraftMetaCreativeIdIsReal &&
    !normalizeNonEmptyString(adCreativeId);

  function extractPreviewBody(result) {
    if (!result) return "";
    if (typeof result?.body === "string" && result.body.trim()) return result.body.trim();
    const data = Array.isArray(result?.data) ? result.data : [];
    for (const item of data) {
      if (typeof item?.body === "string" && item.body.trim()) return item.body.trim();
    }
    return "";
  }

  function extractIframeSrcFromHtml(html) {
    const raw = String(html || "");
    if (!raw.trim()) return "";
    // Best-effort: Meta previews usually return an <iframe ... src="..."> snippet.
    const match = raw.match(/<iframe[^>]+src=(?:"([^"]+)"|'([^']+)')[^>]*>/i);
    const src = match?.[1] || match?.[2] || "";
    try {
      const url = new URL(src);
      return url.toString();
    } catch {
      return "";
    }
  }

  const creativePreviewBody = extractPreviewBody(creativePreviewResult);
  const adPreviewBody = extractPreviewBody(adPreviewResult);
  const creativePreviewUrl = extractIframeSrcFromHtml(creativePreviewBody);
  const adPreviewUrl = extractIframeSrcFromHtml(adPreviewBody);

  const candidates = (() => {
    const list = [];

    const myPages = Array.isArray(pagesResult?.myPages) ? pagesResult.myPages : [];
    const promotePages = Array.isArray(pagesResult?.promotePages) ? pagesResult.promotePages : [];
    const ownedPagesByBusiness = Array.isArray(pagesResult?.ownedPagesByBusiness) ? pagesResult.ownedPagesByBusiness : [];
    const ownedPagesFromAdAccountBusiness = Array.isArray(pagesResult?.ownedPagesFromAdAccountBusiness)
      ? pagesResult.ownedPagesFromAdAccountBusiness
      : [];

    for (const p of myPages) list.push({ id: p?.id ?? null, name: p?.name ?? null, source: "me/accounts" });
    for (const p of promotePages) list.push({ id: p?.id ?? null, name: p?.name ?? null, source: "act/promote_pages" });
    for (const b of ownedPagesByBusiness) {
      const pages = Array.isArray(b?.pages) ? b.pages : [];
      for (const p of pages) {
        list.push({ id: p?.id ?? null, name: p?.name ?? null, source: `business:${b?.business_id ?? "—"}` });
      }
    }
    for (const p of ownedPagesFromAdAccountBusiness) {
      const bizId = pagesResult?.adAccountBusiness?.id ?? null;
      list.push({ id: p?.id ?? null, name: p?.name ?? null, source: `adaccount.business:${bizId || "—"}` });
    }

    const seen = new Set();
    return list
      .filter((p) => typeof p.id === "string" && p.id.trim())
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
  })();

  return (
    <CollapsibleCard
      id="meta-test-step-ad"
      title="Etapa 3 — Ad (PAUSED)"
      description="Criação incremental via `POST /api/meta/ads` (REAL/STUB). Sempre PAUSED. REAL requer token no backend e um creative válido (via `creativeId` ou draft com `meta_creative_id`)."
      meta={normalizeNonEmptyString(createdMetaAdSetId) ? "OK" : "—"}
      defaultOpen={Boolean(normalizeNonEmptyString(createdMetaAdSetId))}
    >

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Meta AdSet ID (origem)
          </span>
          <input
            value={createdMetaAdSetId}
            readOnly
            placeholder="Será preenchido quando AdSet existir"
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 800,
              outline: "none",
              background: "#f9fafb",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Nome do Ad
          </span>
          <input
            value={adName}
            onChange={(e) => setAdName(e.target.value)}
            placeholder="Ex: Ad BR — Image 1"
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
              background: "#ffffff",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Creative ID (somente REAL; opcional se draft já tem `meta_creative_id`)
          </span>
          <input
            value={adCreativeId}
            onChange={(e) => setAdCreativeId(e.target.value)}
            placeholder={
              selectedCreativeDraftMetaCreativeIdIsReal ? `Sugestão: ${selectedCreativeDraftMetaCreativeId}` : "Ex: <meta_creative_id>"
            }
            disabled={flowMode === "STUB"}
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
              background: flowMode === "STUB" ? "#f9fafb" : "#ffffff",
            }}
          />
        </label>

        {canUseDraftCreativeId ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="pillOutline" onClick={() => setAdCreativeId(String(selectedCreativeDraftMetaCreativeId))}>
              Usar `meta_creative_id` do draft
            </button>
            <div className="muted" style={{ fontWeight: 800 }}>
              Draft já tem creative REAL publicado.
            </div>
          </div>
        ) : null}

        <label style={{ display: "grid", gap: 6 }}>
          <span className="muted" style={{ fontWeight: 900 }}>
            Creative draft (local)
          </span>
          <select
            value={creativeDraftId || ""}
            onChange={(e) => setCreativeDraftId(e.target.value)}
            disabled={!creativeDraftOptions?.length}
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 800,
              outline: "none",
              background: "#ffffff",
            }}
          >
            <option value="">(nenhum)</option>
            {(creativeDraftOptions ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {(d.headline || d.primary_text || d.id).slice(0, 60)}
              </option>
            ))}
          </select>
          <div className="muted" style={{ fontWeight: 800 }}>
            Persistido no DB; útil para rastreabilidade e futura criação de Creative REAL.
          </div>
        </label>
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Creative REAL (a partir do draft)</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 800, lineHeight: 1.55 }}>
          Publica um AdCreative na Meta via backend (token no backend). Se vazio, usa `META_PAGE_ID` / `META_INSTAGRAM_ACTOR_ID`.
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>Page ID</span>
            <input
              value={metaPageId}
              onChange={(e) => setMetaPageId(e.target.value)}
              placeholder="Opcional (env: META_PAGE_ID)"
              disabled={flowMode === "STUB"}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
                background: flowMode === "STUB" ? "#f9fafb" : "#ffffff",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>Instagram Actor ID</span>
            <input
              value={metaInstagramActorId}
              onChange={(e) => setMetaInstagramActorId(e.target.value)}
              placeholder="Opcional (env: META_INSTAGRAM_ACTOR_ID)"
              disabled={flowMode === "STUB"}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
                background: flowMode === "STUB" ? "#f9fafb" : "#ffffff",
              }}
            />
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="pillOutline" disabled={!canPublishCreative} onClick={onPublishCreative}>
            {creativePublishing ? "Publicando..." : "Publicar Creative REAL"}
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={flowMode === "STUB" || !normalizeNonEmptyString(creativeDraftId)}
            onClick={async () => {
              const baseUrl = getBackendBaseUrl();
              const id = normalizeNonEmptyString(creativeDraftId);
              const payload = {
                ...(normalizeNonEmptyString(metaPageId) ? { pageId: metaPageId.trim() } : null),
                ...(normalizeNonEmptyString(metaInstagramActorId) ? { instagramActorId: metaInstagramActorId.trim() } : null),
                force: creativePublishForce === true,
              };
              const json = JSON.stringify(payload);
              const cmd = `curl -X POST '${escapeShellSingleQuotes(`${baseUrl}/api/meta/creative-drafts/${id}/publish`)}' -H 'Content-Type: application/json' -d '${escapeShellSingleQuotes(json)}'`;
              try {
                await copyTextToClipboard(cmd);
              } catch {
                // ignore
              }
            }}
            title="Copia um comando curl (sem token) para publicar o Creative REAL via backend."
          >
            Copiar curl (Publish)
          </button>
          <button type="button" className="pillOutline" disabled={!canFetchCreative} onClick={onFetchCreative}>
            {creativeGetLoading ? "Consultando..." : "Consultar Creative (Graph)"}
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={flowMode === "STUB" || pageValidateLoading || !normalizeNonEmptyString(metaPageId)}
            onClick={onValidatePage}
            title="Valida se o token consegue ler a Page (GET /api/meta/pages/:id)."
          >
            {pageValidateLoading ? "Validando..." : "Validar Page ID"}
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={flowMode === "STUB" || pagesLoading}
            onClick={onListPages}
          >
            {pagesLoading ? "Listando..." : "Listar Pages (Graph)"}
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={flowMode === "STUB" || !normalizeNonEmptyString(metaAdAccountId)}
            onClick={async () => {
              const baseUrl = getBackendBaseUrl();
              const act = metaAdAccountId.trim();
              const cmd = `curl '${escapeShellSingleQuotes(`${baseUrl}/api/meta/pages?metaAdAccountId=${encodeURIComponent(act)}`)}'`;
              try {
                await copyTextToClipboard(cmd);
              } catch {
                // ignore
              }
            }}
            title="Copia um comando curl (sem token) para listar Pages via backend."
          >
            Copiar curl (Pages)
          </button>
          <div className="muted" style={{ fontWeight: 800 }}>
            Requer modo REAL + token no backend + `creativeDraftId` com `destinationUrl`.
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10, fontWeight: 900 }}>
          Page ID:{" "}
          {normalizeNonEmptyString(metaPageId)
            ? "UI"
            : backendHasPageId
            ? "env (META_PAGE_ID)"
            : "AUSENTE (preencha no UI ou no env)"}
          {" · "}
          Instagram Actor ID:{" "}
          {normalizeNonEmptyString(metaInstagramActorId)
            ? "UI"
            : backendHasInstagramActorId
            ? "env (META_INSTAGRAM_ACTOR_ID)"
            : "— (opcional)"}
        </div>

        {pagesError ? (
          <div className="muted" style={{ marginTop: 10, fontWeight: 900, color: "#991b1b" }}>
            Falha ao listar Pages: {pagesError}
            <JsonAccordion title="Detalhes (erro Pages)" value={pagesErrorDetails} />
          </div>
        ) : null}

        {pageValidateError ? (
          <div className="muted" style={{ marginTop: 10, fontWeight: 900, color: "#991b1b" }}>
            Falha ao validar Page ID: {pageValidateError}
            <JsonAccordion title="Detalhes (erro Page ID)" value={pageValidateErrorDetails} />
          </div>
        ) : null}

        {pageValidateResult ? (
          <div className="card" style={{ padding: 12, marginTop: 10 }}>
            <div className="muted" style={{ fontWeight: 900 }}>Page OK</div>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              {pageValidateResult?.name ? `${pageValidateResult.name} (${pageValidateResult.id || "—"})` : pageValidateResult?.id || "—"}
            </div>
          </div>
        ) : null}

        {pagesResult ? (
          <>
            <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
              Se vazio, o token provavelmente não tem acesso a uma Page. Você ainda pode informar `pageId` manualmente.
            </div>
            {candidates.length ? (
              <div className="card" style={{ padding: 12, marginTop: 10 }}>
                <div className="muted" style={{ fontWeight: 900 }}>Sugestões de Page ID</div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {candidates.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {p.name || "—"} <span className="muted" style={{ fontWeight: 800 }}>({p.id})</span>
                        <div className="muted" style={{ marginTop: 4, fontWeight: 800 }}>Fonte: {p.source}</div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="pillOutline"
                          onClick={() => setMetaPageId(String(p.id))}
                          disabled={flowMode === "STUB"}
                          style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                        >
                          Usar pageId
                        </button>
                        <button
                          type="button"
                          className="pillOutline"
                          onClick={async () => {
                            try {
                              await copyTextToClipboard(String(p.id));
                            } catch {
                              // ignore
                            }
                          }}
                          style={{ height: 32, padding: "0 12px", fontSize: 12, fontWeight: 900 }}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {candidates.length > 8 ? (
                  <div className="muted" style={{ marginTop: 8, fontWeight: 800 }}>
                    +{candidates.length - 8} Page(s) ocultas…
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 10, fontWeight: 900, color: "#991b1b" }}>
                Nenhuma Page encontrada via Graph nas fontes atuais (`me/accounts`, `act_*/promote_pages`, `owned_pages`).
              </div>
            )}
            <JsonAccordion
              title={`Pages (Graph) — metaAdAccountId: ${metaAdAccountId || "—"}`}
              value={pagesResult}
            />
          </>
        ) : null}

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, userSelect: "none" }}>
          <input
            type="checkbox"
            checked={creativePublishForce === true}
            onChange={(e) => setCreativePublishForce(e.target.checked)}
            disabled={flowMode === "STUB"}
          />
          <span className="muted" style={{ fontWeight: 900 }}>
            Force republish (sobrescreve `meta_creative_id` existente no draft)
          </span>
        </label>

        {creativeDraftId && !creativeDraftHasUrl ? (
          <div className="muted" style={{ marginTop: 8, fontWeight: 900, color: "#991b1b" }}>
            Draft selecionado sem `destinationUrl` — publique só depois de preencher a URL no draft.
          </div>
        ) : null}
        {selectedCreativeDraftMetaCreativeId && selectedCreativeDraftMetaCreativeIdIsReal && !creativePublishForce ? (
          <div className="muted" style={{ marginTop: 8, fontWeight: 900, color: "#991b1b" }}>
            Draft já possui `meta_creative_id`: <b>{selectedCreativeDraftMetaCreativeId}</b>. Marque{" "}
            <b>Force republish</b> para publicar novamente.
          </div>
        ) : null}
        {flowMode === "REAL" &&
        creativeDraftId &&
        !normalizeNonEmptyString(metaPageId) &&
        !backendHasPageId ? (
          <div className="muted" style={{ marginTop: 8, fontWeight: 900, color: "#991b1b" }}>
            Faltando <b>Page ID</b> (obrigatório) — preencha acima ou configure <b>META_PAGE_ID</b> no backend.
          </div>
        ) : null}

        <JsonAccordion title="Evidência: Creative (Graph)" value={creativeGetResult} />
      </div>

      <div className="card" style={{ padding: 14, marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Previews (Graph) — HTML (24h)</div>
        <div className="muted" style={{ marginTop: 6, fontWeight: 800, lineHeight: 1.55 }}>
          Usa `GET /api/meta/creatives/:id/previews` e `GET /api/meta/ads/:id/previews` via backend. Retorna snippet HTML (geralmente um iframe) que expira em ~24h.
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span className="muted" style={{ fontWeight: 900 }}>ad_format</span>
            <select
              value={previewAdFormat || "DESKTOP_FEED_STANDARD"}
              onChange={(e) => setPreviewAdFormat(e.target.value)}
              disabled={flowMode === "STUB"}
              style={{
                height: 38,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 800,
                outline: "none",
                background: flowMode === "STUB" ? "#f9fafb" : "#ffffff",
              }}
            >
              <option value="DESKTOP_FEED_STANDARD">DESKTOP_FEED_STANDARD</option>
              <option value="MOBILE_FEED_STANDARD">MOBILE_FEED_STANDARD</option>
              <option value="RIGHT_COLUMN_STANDARD">RIGHT_COLUMN_STANDARD</option>
              <option value="INSTAGRAM_STANDARD">INSTAGRAM_STANDARD</option>
              <option value="INSTAGRAM_STORY">INSTAGRAM_STORY</option>
              <option value="FACEBOOK_STORY_MOBILE">FACEBOOK_STORY_MOBILE</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="pillOutline"
            disabled={flowMode === "STUB" || creativePreviewLoading || !normalizeNonEmptyString(effectiveCreativeId)}
            onClick={() => onFetchCreativePreview?.(effectiveCreativeId)}
            title="Gera preview HTML para o AdCreative."
          >
            {creativePreviewLoading ? "Consultando preview (Creative)..." : "Preview Creative (Graph)"}
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={!creativePreviewBody}
            onClick={async () => {
              try {
                await copyTextToClipboard(creativePreviewBody);
              } catch {
                // ignore
              }
            }}
            title="Copia o HTML do preview (primeiro body encontrado)."
          >
            Copiar HTML (Creative)
          </button>
          {creativePreviewUrl ? (
            <a
              className="pillOutline"
              href={creativePreviewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              title="Abre o preview em uma nova aba (URL extraída do iframe)."
            >
              Abrir preview (Creative)
            </a>
          ) : null}

          <button
            type="button"
            className="pillOutline"
            disabled={flowMode === "STUB" || adPreviewLoading || !normalizeNonEmptyString(createdMetaAdId)}
            onClick={() => onFetchAdPreview?.(createdMetaAdId)}
            title="Gera preview HTML para o Ad."
          >
            {adPreviewLoading ? "Consultando preview (Ad)..." : "Preview Ad (Graph)"}
          </button>
          <button
            type="button"
            className="pillOutline"
            disabled={!adPreviewBody}
            onClick={async () => {
              try {
                await copyTextToClipboard(adPreviewBody);
              } catch {
                // ignore
              }
            }}
            title="Copia o HTML do preview (primeiro body encontrado)."
          >
            Copiar HTML (Ad)
          </button>
          {adPreviewUrl ? (
            <a
              className="pillOutline"
              href={adPreviewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              title="Abre o preview em uma nova aba (URL extraída do iframe)."
            >
              Abrir preview (Ad)
            </a>
          ) : null}
          <div className="muted" style={{ fontWeight: 800 }}>
            Requer modo REAL + token no backend. Ad preview exige Ad criado.
          </div>
        </div>

        {creativePreviewError ? (
          <div className="muted" style={{ marginTop: 10, fontWeight: 900, color: "#991b1b" }}>
            Falha ao consultar preview do Creative: {creativePreviewError}
            <JsonAccordion title="Detalhes (erro preview Creative)" value={creativePreviewErrorDetails} />
          </div>
        ) : null}
        {adPreviewError ? (
          <div className="muted" style={{ marginTop: 10, fontWeight: 900, color: "#991b1b" }}>
            Falha ao consultar preview do Ad: {adPreviewError}
            <JsonAccordion title="Detalhes (erro preview Ad)" value={adPreviewErrorDetails} />
          </div>
        ) : null}

        <JsonAccordion
          title={`Evidência: Preview (Creative) — ad_format: ${previewAdFormat || "—"}`}
          value={creativePreviewResult}
        />
        <JsonAccordion
          title={`Evidência: Preview (Ad) — ad_format: ${previewAdFormat || "—"}`}
          value={adPreviewResult}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="pillOutline" disabled={!canCreateAd} onClick={onCreateAd}>
          {adCreating ? "Criando..." : `Criar Ad ${flowMode} (PAUSED)`}
        </button>
        <button
          type="button"
          className="pillOutline"
          disabled={flowMode !== "REAL" || !normalizeNonEmptyString(createdGeneratedCampaignId)}
          onClick={async () => {
            const baseUrl = getBackendBaseUrl();
            const payload = {
              generatedCampaignId: createdGeneratedCampaignId,
              name: normalizeNonEmptyString(adName) ? adName.trim() : "Ad — 1",
              ...(normalizeNonEmptyString(creativeDraftId) ? { creativeDraftId: creativeDraftId.trim() } : null),
              ...(normalizeNonEmptyString(adCreativeId) ? { creativeId: adCreativeId.trim() } : null),
              mode: "REAL",
            };
            const json = JSON.stringify(payload);
            const cmd = `curl -X POST '${escapeShellSingleQuotes(`${baseUrl}/api/meta/ads`)}' -H 'Content-Type: application/json' -d '${escapeShellSingleQuotes(json)}'`;
            try {
              await copyTextToClipboard(cmd);
            } catch {
              // ignore
            }
          }}
          title="Copia um comando curl (sem token) para criar Ad REAL (PAUSED) via backend."
        >
          Copiar curl (Ad REAL)
        </button>
        <div className="muted" style={{ fontWeight: 800 }}>
          Requer AdSet criado acima. REAL exige token no backend e `creativeId` (ou draft com `meta_creative_id`).
        </div>
      </div>

      <JsonAccordion
        title="Preview do payload"
        value={{
          generatedCampaignId: createdGeneratedCampaignId || null,
          name: normalizeNonEmptyString(adName) || null,
          creativeIdInput: flowMode === "REAL" ? normalizeNonEmptyString(adCreativeId) || null : undefined,
          creativeIdEffective: flowMode === "REAL" ? effectiveCreativeId : undefined,
          creativeDraftId: normalizeNonEmptyString(creativeDraftId) || null,
          mode: flowMode,
        }}
      />
    </CollapsibleCard>
  );
}

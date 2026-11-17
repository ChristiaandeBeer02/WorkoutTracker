import { useEffect, useState } from "react";
import qrcode from "qrcode-generator";
import { sharedDaysFromIds } from "../dayShare";
import { encodeShareCode, QR_LINK_LIMIT, ShareError, shareUrl } from "../shareCodec";

export function ExportDays({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const days = sharedDaysFromIds(ids);
  const title = days.length === 1 ? days[0].name : `${days.length} days`;

  useEffect(() => {
    let cancel = false;
    const shared = sharedDaysFromIds(ids);
    encodeShareCode(shared)
      .then((next) => {
        if (!cancel) setCode(next);
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof ShareError ? caught.message : "Couldn't build a share code.");
      });
    return () => {
      cancel = true;
    };
  }, [ids]);

  const link = code ? shareUrl(code) : "";
  const qr = link.length > 0 && link.length <= QR_LINK_LIMIT ? qrSvg(link) : "";

  async function copy(value: string, ok: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(ok);
    } catch {
      setNotice("Select the code and copy it.");
    }
  }

  async function share() {
    if (!link) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Workout days", url: link });
        return;
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
      }
    }
    await copy(link, "Link copied");
  }

  return (
    <>
      <button type="button" className="backdrop share-layer" aria-label="Close share" onClick={onClose} />
      <div className="manage-pop share-layer" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h2 id="share-title">Share {title}</h2>
        <p className="share-note">Names, colours, exercises and set counts. No saved weights.</p>
        {error ? <p className="manage-note">{error}</p> : null}
        {code ? (
          <textarea className="share-code" readOnly value={code} aria-label="Share code" spellCheck={false} rows={3} />
        ) : error ? null : (
          <p className="share-note">Preparing share code…</p>
        )}
        {qr ? (
          <div className="share-qr" role="img" aria-label="QR code for the share link" dangerouslySetInnerHTML={{ __html: qr }} />
        ) : code ? (
          <p className="share-note">Too big for a QR code, use the share link or copy the code instead.</p>
        ) : null}
        {notice ? <p className="tracker-notice">{notice}</p> : null}
        <div className="manage-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button type="button" onClick={() => void share()} disabled={!code}>
            Share link
          </button>
          <button type="button" className="manage-save" onClick={() => void copy(code, "Code copied")} disabled={!code}>
            Copy
          </button>
        </div>
      </div>
    </>
  );
}

function qrSvg(text: string): string {
  try {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
  } catch {
    return "";
  }
}

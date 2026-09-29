import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Page } from "../api/client";
import { useAuth } from "../auth/Auth";
import { useIdempotency } from "../components/forms";
import {
  PageTitle,
  Panel,
  Guardrail,
  Loading,
  ErrorState,
  Empty,
  Badge,
  Pagination,
  formatDate,
} from "../components/UI";
interface DocumentItem {
  id: string;
  filename: string;
  media_type: string;
  size_bytes: number;
  state: string;
  scan_status: string;
  created_at: string;
  content_base64?: string;
}
export default function Documents() {
  const { id } = useParams();
  const { facility } = useAuth();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const file = useRef<HTMLInputElement>(null);
  const key = useIdempotency();
  const doctor = facility?.roles.includes("DOCTOR");
  const q = useQuery({
    queryKey: ["documents", facility?.id, id, page],
    queryFn: () =>
      api.get<
        Page<DocumentItem> & { storage: string; malware_scanner: string }
      >(`/patients/${id}/documents?page=${page}`),
    refetchInterval: 5000,
  });
  const upload = useMutation({
    mutationFn: async () => {
      const chosen = file.current?.files?.[0];
      if (!chosen) throw new Error("Select a PDF or PNG file.");
      if (chosen.size > 32768 || chosen.size === 0)
        throw new Error("Files must contain 1–32,768 bytes.");
      const bytes = new Uint8Array(await chosen.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const body = {
        filename: chosen.name,
        media_type: chosen.type,
        content_base64: btoa(binary),
      };
      return api.post<DocumentItem>(
        `/patients/${id}/documents`,
        body,
        key(body),
      );
    },
    onSuccess: () => {
      if (file.current) file.current.value = "";
      cache.invalidateQueries({ queryKey: ["documents"] });
    },
  });
  const download = useMutation({
    mutationFn: async (doc: DocumentItem) => {
      const result = await api.post<DocumentItem>(
        `/documents/${doc.id}/download`,
      );
      const bytes = Uint8Array.from(atob(result.content_base64!), (c) =>
        c.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: result.media_type }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `hcs-document.${result.media_type === "application/pdf" ? "pdf" : "png"}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  const retryKeys = useRef(new Map<string, string>());
  const retry = useMutation({
    mutationFn: (doc: DocumentItem) => {
      if (!retryKeys.current.has(doc.id))
        retryKeys.current.set(doc.id, crypto.randomUUID());
      return api.post(
        `/documents/${doc.id}/retry-scan`,
        undefined,
        retryKeys.current.get(doc.id),
      );
    },
    onSuccess: (_, doc) => {
      retryKeys.current.delete(doc.id);
      return cache.invalidateQueries({ queryKey: ["documents"] });
    },
  });
  return (
    <>
      <Link className="back-link" to={`/patients/${id}`}>
        Back to patient profile
      </Link>
      <PageTitle
        eyebrow="PROTECTED DOCUMENTS"
        title="Document quarantine"
        description="Scoped file handling, not clinical authoring or validation. Synthetic files only in this environment."
      />
      <Guardrail>
        Production object storage and malware scanning are NOT CONFIGURED. The
        explicitly enabled development adapter stores encrypted quarantine
        objects in PostgreSQL. Structural validation is not a malware scan. No
        file is downloadable without a clean scanner verdict; no manual clean
        override exists.
      </Guardrail>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          {doctor && (
            <Panel
              title="Upload to quarantine"
              subtitle={`Storage: ${q.data?.storage}. PDF or PNG only; maximum 32 KiB.`}
            >
              <form
                className="standard-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  upload.mutate();
                }}
              >
                {upload.error && <ErrorState error={upload.error} />}
                <label>
                  Synthetic document file
                  <input
                    ref={file}
                    required
                    type="file"
                    accept="application/pdf,image/png"
                  />
                </label>
                <button
                  className="button primary"
                  disabled={
                    upload.isPending || q.data?.storage === "unconfigured"
                  }
                >
                  {upload.isPending ? "Quarantining…" : "Upload to quarantine"}
                </button>
                {upload.isSuccess && (
                  <p role="status">
                    File stored in quarantine. No clinical or malware approval
                    has been granted.
                  </p>
                )}
              </form>
            </Panel>
          )}
          <Panel
            title="Patient documents"
            subtitle="Each list and download attempt is audited. Archived profiles are not exposed."
          >
            {download.error && <ErrorState error={download.error} />}
            {retry.error && <ErrorState error={retry.error} />}
            {q.data?.items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>State</th>
                      <th>Scanner status</th>
                      <th>Uploaded</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.items.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.filename}</td>
                        <td>{doc.size_bytes} bytes</td>
                        <td>
                          <Badge
                            tone={doc.state === "CLEAN" ? "green" : "amber"}
                          >
                            {doc.state}
                          </Badge>
                        </td>
                        <td>{doc.scan_status}</td>
                        <td>{formatDate(doc.created_at)}</td>
                        <td>
                          {doc.state === "CLEAN" ? (
                            <button
                              className="button secondary small"
                              disabled={download.isPending}
                              onClick={() => download.mutate(doc)}
                            >
                              Download file
                            </button>
                          ) : doctor &&
                            doc.state === "QUARANTINED" &&
                            doc.scan_status !== "PENDING" ? (
                            <button
                              className="button secondary small"
                              disabled={retry.isPending}
                              onClick={() => retry.mutate(doc)}
                            >
                              Retry scanner
                            </button>
                          ) : (
                            <span>Download blocked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No documents uploaded"
                description="Only assigned clinicians may upload to this quarantine."
              />
            )}
            <Pagination
              page={page}
              total={q.data?.total ?? 0}
              onChange={setPage}
            />
          </Panel>
        </>
      )}
    </>
  );
}

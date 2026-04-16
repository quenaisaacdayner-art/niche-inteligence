import { useRef, useState } from "react";
import { useEditorStore } from "../stores/editor";
import { uploadMaster, uploadOverlay, deleteOverlayRemote } from "../api";
import type { Overlay } from "../types";

function formatSeconds(s: number): string {
  if (!isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function Bin() {
  const slug = useEditorStore((s) => s.slug);
  const projectInfo = useEditorStore((s) => s.projectInfo);
  const overlays = useEditorStore((s) => s.overlays);
  const selectedOverlayId = useEditorStore((s) => s.selectedOverlayId);
  const addOverlay = useEditorStore((s) => s.addOverlay);
  const removeOverlay = useEditorStore((s) => s.removeOverlay);
  const selectOverlay = useEditorStore((s) => s.selectOverlay);
  const setProjectInfo = useEditorStore((s) => s.setProjectInfo);
  const currentTime = useEditorStore((s) => s.currentTime);
  const pushToast = useEditorStore((s) => s.pushToast);

  const masterInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const hasMaster = !!projectInfo?.master;

  const handleMasterUpload = async (file: File) => {
    if (!slug || !file.name.toLowerCase().endsWith(".mp4")) {
      pushToast("Só aceita .mp4", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadMaster(slug, file, hasMaster);
      pushToast("Master uploaded", "success");
      // Backend will emit WS event → App refetches projectInfo
      // But we also update locally as a nice UX
      setProjectInfo({
        slug,
        master: { file: "master.mp4" },
        overlays: projectInfo?.overlays ?? [],
        has_body: projectInfo?.has_body ?? false,
        data_dir: projectInfo?.data_dir ?? "",
      });
    } catch (err) {
      pushToast(`Erro no upload: ${(err as Error).message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleOverlayUpload = async (files: FileList) => {
    if (!slug) return;
    setUploading(true);
    try {
      // Pick next free track (start at 2, then 3, 4...). Simple heuristic.
      const usedTracks = new Set(overlays.map((o) => o.track));
      let track = 2;
      while (usedTracks.has(track)) track++;

      // Upload each file sequentially; each gets its own track if multiple uploaded at once.
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith(".mp4")) {
          pushToast(`${file.name}: só aceita .mp4`, "error");
          continue;
        }
        const overlay = await uploadOverlay(slug, file, track, currentTime);
        addOverlay(overlay as Overlay);
        track++;
      }
      pushToast("Clips uploaded", "success");
    } catch (err) {
      pushToast(`Erro no upload: ${(err as Error).message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (overlayId: string) => {
    if (!slug) return;
    try {
      await deleteOverlayRemote(slug, overlayId);
      removeOverlay(overlayId);
      pushToast("Clip removido", "info");
    } catch (err) {
      pushToast(`Erro: ${(err as Error).message}`, "error");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Master section */}
      <div className="p-3 border-b border-editor-divider space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-editor-muted font-semibold">Master</span>
          {hasMaster && (
            <span className="text-[9px] text-cut-approved" title="master.mp4 presente">
              ✓ pronto
            </span>
          )}
        </div>

        {hasMaster ? (
          <div className="bg-editor-bg rounded px-2.5 py-2 border border-editor-divider">
            <div className="text-[11px] text-editor-text font-medium">{projectInfo?.master?.file}</div>
            <div className="text-[10px] text-editor-dim mt-1">track 1 (vídeo principal)</div>
          </div>
        ) : (
          <div className="bg-editor-bg rounded px-2.5 py-2 border border-dashed border-editor-border text-[10px] text-editor-muted text-center">
            Sem master.mp4
          </div>
        )}

        <input
          ref={masterInputRef}
          type="file"
          accept="video/mp4"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleMasterUpload(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => masterInputRef.current?.click()}
          disabled={uploading}
          className="w-full ghost-btn justify-center text-[10px]"
        >
          {hasMaster ? "Substituir master" : "+ Upload master"}
        </button>
      </div>

      {/* Overlays section */}
      <div className="flex items-center justify-between p-3 border-b border-editor-divider">
        <span className="text-[10px] uppercase tracking-wide text-editor-muted font-semibold">
          Clips overlays <span className="text-editor-dim ml-1">{overlays.length}</span>
        </span>
        <input
          ref={overlayInputRef}
          type="file"
          accept="video/mp4"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length) handleOverlayUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => overlayInputRef.current?.click()}
          disabled={uploading || !slug}
          className="icon-btn text-[11px]"
          title="Upload novo clip"
        >
          + Upload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {overlays.length === 0 && (
          <div className="text-center text-editor-muted text-[11px] p-6">
            Nenhum clip.<br />
            Upload um .mp4 pra posicionar como overlay.
          </div>
        )}

        {overlays.map((ov) => {
          const isSelected = ov.id === selectedOverlayId;
          const dur = ov.time_out - ov.time_in;
          return (
            <div
              key={ov.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("application/x-overlay-id", ov.id);
              }}
              onClick={() => selectOverlay(ov.id)}
              className={`group rounded px-2.5 py-2 cursor-pointer transition-colors border ${
                isSelected
                  ? "bg-accent-muted border-accent"
                  : "bg-editor-bg border-editor-divider hover:border-editor-border hover:bg-editor-elevated"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cut-manual" />
                <span className="text-editor-text text-[11px] font-medium truncate flex-1" title={ov.file}>
                  {ov.file}
                </span>
                <span className="text-editor-dim text-[9px] font-mono">{formatSeconds(dur)}</span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-editor-muted">
                <span className="font-mono">track {ov.track}</span>
                <span className="font-mono">@ {formatSeconds(ov.timeline_pos)}</span>
                <span className="text-editor-dim uppercase tracking-wider">{ov.position}</span>
              </div>

              <div className="mt-1 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(ov.id);
                  }}
                  className="text-[9px] text-editor-dim hover:text-cut-retake transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

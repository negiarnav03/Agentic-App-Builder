// CodePanel.tsx
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useRef, useState } from "react";
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    SandpackFileExplorer,
    useSandpack,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import {
    Eye,
    Code2,
    Download,
    AlertTriangle,
    Bot,
    Loader2,
    ArrowUp,
    Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PricingModal from "@/components/PricingModal";
import type { FileData, StatusStep } from "@/types/workspace";
import { RingLoader } from "react-spinners";
import { unsubscribe } from "diagnostics_channel";
import JSZip from "jszip";

// ─── Placeholder ──────────────────────────────────────────────────────────────

const PLACEHOLDER_FILES = {
    "/App.js": {
        code: `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 14 }}>Your app will appear here</p>
      </div>
    </div>
  );
}`,
    },
};

// ─── Base dependencies ────────────────────────────────────────────────────────

const BASE_DEPENDENCIES: Record<string, string> = {
    "react-is": "latest",
    "react-router-dom": "latest",
    "lucide-react": "latest",
    recharts: "latest",
    "date-fns": "latest",
    "framer-motion": "latest",
    "react-hook-form": "latest",
    "@hookform/resolvers": "latest",
    zod: "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-accordion": "latest",
    "@radix-ui/react-select": "latest",
    axios: "latest",
    clsx: "latest",
    "class-variance-authority": "latest",
    "tailwind-merge": "latest",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "preview" | "code";

interface CodePanelProps {
    fileData: FileData | null;
    isGenerating: boolean;
    statusLog: StatusStep[];
    onImprove?: (userRequest: string) => Promise<void>;
    onFixError?: (error: string) => Promise<void>;
    onFilePatch: (patches: FileData) => void;
    isImproving: boolean;
    appTitle?: string | null;
    isProUser?: boolean;
}

function SandpackInner({
    fileData,
    isGenerating,
    activeTab,
    setActiveTab,
    statusLog,
    isImproving,
    onFixError,
    isProUser,
    appTitle,
    onImprove,
}: {
    fileData: FileData | null;
    isGenerating: boolean;
    statusLog: StatusStep[];
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    isImproving: boolean;
    onFixError?: (error: string) => Promise<void>;
    appTitle?: string | null;
    isProUser?: boolean;
    onImprove?: (userRequest: string) => Promise<void>;


    // todo : apptitle isprouser
}) {
    const { sandpack, listen } = useSandpack();
    const [previewError, setPreviewError] = useState<string | null>("error in the app",);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const [improveInput, setImproveInput] = useState("");
    const [showImproveInput, setShowImproveInput] = useState(false);

    const [isExporting, setIsExporting] = useState(false);

    const handleExportZip = async () => {
        if (isExporting) return;
        setIsExporting(true);

        try {
            const filesToZip =
                Object.keys(sandpack.files).length > 0
                    ? sandpack.files
                    : (fileData?.files ?? {});

            const dependencies = {
                ...BASE_DEPENDENCIES,
                ...(fileData?.dependencies ?? {}),
            };
            const zip = new JSZip();

            zip.file(
                "package.json",
                JSON.stringify({
                    name: appTitle ?? "AI APP",
                    version: "1.0.0",
                    private: true,
                    dependencies: {
                        react: "^18.2.0",
                        "react-dom": "^18.2.0",
                        "react-script": "^5.0.1",
                        ...dependencies,
                    },
                    scripts: {
                        start: "react-scripts start",
                        build: "react-scripts build",
                    },
                    browserslist: {
                        production: [">0.2%", "last 2 versions", "not dead"],
                        development: [
                            ">0.2%",
                            "last 2 chrome versions",
                            "last 2 firefox versions",
                            "last 2 safari versions",
                        ]
                    },
                },
                    null,
                    2,
                ),
            );

            // inject tailwind cdn in the html template
            zip.file(
                "public/index.html",
                `<!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#000000" />
                <title>${appTitle ?? "AI APP"}</title>
                </head>
                <body>
                <div id="root"></div>
                <script src="https://cdn.tailwindcss.com"></script>
                </body>
                </html>
                `
            );

            //All generated source files. used src.

            for (const [filePath, fileObj] of Object.entries(filesToZip)) {
                const code = typeof fileObj === "object" && fileObj != null && "code" in fileObj ?
                    (fileObj as { code: string }).code
                    : "";

                const zipPath = filePath.startsWith("/")
                    ? `src${filePath}`
                    : `src/${filePath}`;

                zip.file(zipPath, code);
            }

            zip.file(
                "src/index.js",
                `import React from "react";
                import ReactDOM from "react-dom/client";
                import "./styles.css";
                import App from "./App";

                const root = ReactDOM.createRoot(document.getElementById("root"));
                root.render(
                <React.StrictMode>
                    <App />
                </React.StrictMode>
                );
                `
            )

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = appTitle ? `${appTitle?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-\.]/g, " ")}.zip` : "ai-app.zip";
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export ZIP file", err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImproveSubmit = async () => {
        const trimmed = improveInput.trim();
        if (!trimmed || isImproving) return;
        setImproveInput("");
        setShowImproveInput(false);
        await onImprove?.(trimmed);
    }

    useEffect(() => {
        unsubscribeRef.current = listen((msg) => {
            if (
                msg.type === "action" &&
                "action" in msg &&
                msg.action === "show-error"
            ) {
                const errMsg = "message" in msg && typeof msg.message === "string"
                    ? msg.message
                    : "An error occured in the  preview";
                setPreviewError(errMsg);
                return;
            }

            // compile error - only treat as error if "error" key is present
            if (msg.type === "compile" && "error" in msg) {
                const errMsg = "message" in msg && typeof msg.message === "string"
                    ? msg.message
                    : "Compile error in preview.";
                setPreviewError(errMsg);
                return;
            }

            // success - clear the error
            if (msg.type === "success") {
                setPreviewError(null);
            }
        });

        return () => unsubscribeRef.current?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listen])

    // clear error when a new genration starts
    useEffect(() => {
        if (isGenerating) setPreviewError(null);
    }, [isGenerating])



    // Push file updates into Sandpack without remounting the provider
    const prevFilesRef = useRef<Record<string, { code: string }>>({});
    useEffect(() => {
        if (!fileData?.files) return;
        const prev = prevFilesRef.current;
        for (const [path, { code }] of Object.entries(fileData.files)) {
            if (prev[path]?.code !== code) {
                sandpack.updateFile(path, code);
            }
        }
        prevFilesRef.current = fileData.files;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileData?.files]);

    // todo msg.type== actin
    //todo msg.type === compile 
    //todo msg.type === done



    useEffect(() => {
        if (fileData) setActiveTab("preview");
    }, [fileData]);


    return (
        <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ActiveTab)}
            className="flex h-full flex-col gap-0"
        >
            {/* ── Tab strip ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-white/6 px-2">
                <TabsList
                    variant="line"
                    className="h-auto gap-0 rounded-none bg-transparent p-0"
                >
                    <TabsTrigger className="border-b-2 pt-2" value="code">
                        <Code2 className="h-3.5 w-3.5" />code
                    </TabsTrigger>
                    <TabsTrigger className="border-b-2 pt-2" value="preview">
                        <Eye className="h-3.5 w-3.5" />preview
                    </TabsTrigger>
                </TabsList>

                {isProUser ? (
                    showImproveInput ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                value={improveInput}
                                onChange={(e) => setImproveInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleImproveSubmit();
                                    if (e.key === "Escape") setShowImproveInput(false);
                                }}
                                placeholder="What should I improve?"
                                className="h-7 w-52 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/80 placeholder:text-white/25 focus:border-white/20 focus:outline-none"
                            />
                            <Button
                                size="icon"
                                onClick={handleImproveSubmit}
                                disabled={!improveInput.trim() || isImproving}
                                className="h-7 w-7 rounded-lg bg-white text-black hover:bg-white/90">
                                {isImproving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <ArrowUp className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowImproveInput(true)}
                            disabled={isImproving || !fileData}
                            className="h-7 gap-1.5 text-xs text-white/40 hover:text-white/70"
                        >
                            <Wand2 className="h-3.5 w-3.5" />
                            {isImproving ? "improving..." : "Improve with Agent"}
                        </Button>
                    )
                ) : (
                    <PricingModal reason="upgrade">
                        <span className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-white/40 hover:text-white/70">
                            <Wand2 className="h-3.5 w-3.5" />
                            Improve with Agent.
                        </span>
                    </PricingModal>
                )}

                {/*download zip buttons */}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportZip}
                    disabled={isExporting || !fileData}
                    className="h=7 gap-1.5 text-ts text-white/40 hover:text-white/70"

                >
                    {isExporting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Download className="h-3.5 w-3.5" />
                    )}
                    Export
                </Button>

            </div>

            {/* ── Sandpack content ──────────────────────────────────────── */}
            {/* SandpackLayout is a Sandpack-specific flex container.        */}
            {/* Sandpack components MUST be its direct children — wrapping   */}
            {/* them in TabsContent breaks the flex layout and causes the    */}
            {/* white border / empty panel issues.                           */}


            <div className="relative flex-1 overflow-hidden">

                {(isGenerating || isImproving) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a]/85 backdrop-blur-sm">
                        <RingLoader color="#60a5fa" size={64} speedMultiplier={0.8} />
                        <div className="flex flex-col items-center gap-1.5">
                            <p className="text-sm font-medium text-white/80">
                                {isImproving
                                    ? "improving with AI Agent..."
                                    : (statusLog[statusLog.length - 1]?.label ?? "Generating...")}
                            </p>

                            <p className="text-xs text-white/20">
                                this usually take 10-20 seconds..
                            </p>
                        </div>

                    </div>)}

                <SandpackLayout
                    style={{
                        height: "100vh",
                        border: "none",
                        borderRadius: 0,
                        background: "transparent",
                    }}
                >
                    <TabsContent
                        value="preview"
                        keepMounted
                        className="mt-0 h-full w-full"
                    >
                        <SandpackPreview
                            style={{ height: "89%" }}
                            showOpenInCodeSandbox={false}
                        />
                    </TabsContent>

                    <TabsContent
                        value="code"
                        keepMounted
                        className="mt-0 flex h-full w-full"
                    >
                        <SandpackFileExplorer
                            style={{
                                height: "90%",
                                width: "180px",
                                borderRight: "0.5px solid rgba(255,255,255,0.08)",
                            }}
                        />
                        <SandpackCodeEditor
                            style={{ height: "90%", flex: 1 }}
                            showTabs
                            showLineNumbers
                            showInlineErrors
                            closableTabs
                            readOnly
                        />
                    </TabsContent>
                </SandpackLayout>


            </div>
            {previewError &&
                !isGenerating &&
                !isImproving &&
                activeTab === "preview" &&
                (
                    <div className="absolute insert-x-0 -bottom-3 z-20 border-t border-red-500/20 bg-red-950/99 p-4 pb-6">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-red-400/80">Preview error</p>

                                <p className="break-all text-[11px]  text-red-300/50">{previewError}</p>


                            </div>

                            <Button
                                onClick={() => onFixError?.(previewError)}
                                variant="destructive"
                                size="sm"
                            >
                                <Wand2 className="h-3 w-3" />
                                Fix with AI

                            </Button>
                        </div>
                    </div>)}
        </Tabs>
    );
}

export function CodePanel({
    fileData,
    isGenerating,
    statusLog,
    onFilePatch: _onFilePatch,
    isImproving,
    onFixError,
    isProUser,
    appTitle,
    onImprove,

}: CodePanelProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

    const files = fileData?.files ?? PLACEHOLDER_FILES;
    const dependencies = {
        ...BASE_DEPENDENCIES,
        ...(fileData?.dependencies ?? {}),
    };

    const filePathKey = Object.keys(files).sort().join("|");

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <SandpackProvider key={filePathKey}
                template="react"
                theme={dracula}
                files={files}
                customSetup={{ dependencies }}
                options={{
                    externalResources: [
                        "https://cdn.tailwindcss.com",
                        "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"
                    ],
                    recompileMode: "delayed",
                    recompileDelay: 500,
                }}
            >
                <SandpackInner
                    fileData={fileData}
                    statusLog={statusLog}
                    isGenerating={isGenerating}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isImproving={isImproving}
                    onFixError={onFixError}
                    isProUser={isProUser}
                    appTitle={appTitle}
                    onImprove={onImprove}
                />
            </SandpackProvider>
        </div>
    )
}


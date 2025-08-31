"use client";

import { InitialData, ReportBugCtx, ReportBugDialog } from "@/components/report-bug-modal";
import { createContext, useContext, useMemo, ReactNode, useState } from "react";

const Ctx = createContext<ReportBugCtx | null>(null);

export function ReportBugProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [initial, setInitial] = useState<InitialData>({});

    const value = useMemo(() => ({
        openReportBug: (init?: InitialData) => {
            setInitial(init ?? {});
            setOpen(true);
        },
    }), []);

    return (
        <Ctx.Provider value={value}>
            {children}
            {open && <ReportBugDialog open={open} onOpenChange={setOpen} initial={initial} />}
        </Ctx.Provider>
    );
}
export function useReportBug() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useReportBug must be used within ReportBugProvider");
    return ctx;
}

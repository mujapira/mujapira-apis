"use client";

import * as React from "react";
import { createContext, useContext, useMemo, useEffect } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bug, Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";

import { apiGateway } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { useAuth } from "@/contexts/auth/auth-context";
import { compressImageFile } from "@/lib/image-compress";

const isBrowserFile = (v: unknown): v is File =>
  typeof window !== "undefined" &&
  typeof (globalThis as any).File !== "undefined" &&
  v instanceof (globalThis as any).File;

const fileSchema = z
    .custom<File>(isBrowserFile, { message: "Arquivo inválido" })
    .refine((f) => f.type?.startsWith("image/"), "Apenas imagens são permitidas")
    .refine((f) => f.size <= 5 * 1024 * 1024, "Cada imagem deve ter no máximo 5MB");

const schema = z.object({
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    description: z.string().min(10, "Descreva o problema (mín. 10 caracteres)"),
    steps: z.string().optional(),
    pageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
    screenshots: z.array(fileSchema).max(3, "Máximo de 3 imagens").optional(),
});

export type FormValues = z.infer<typeof schema>;
export type InitialData = Partial<FormValues>;
export type ReportBugCtx = { openReportBug: (init?: InitialData) => void };


export function ReportBugDialog({
    open,
    onOpenChange,
    initial,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    initial?: InitialData;
}) {
    const { currentUser } = useAuth();

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: "",
            description: "",
            steps: "",
            pageUrl: "",
            severity: "medium",
            screenshots: [],
        },
        mode: "onBlur",
    });

    useEffect(() => {
        if (!open) return;

        form.reset({
            email:
                initial?.email ??
                (currentUser?.email ?? ""),
            description: "",
            steps: "",
            pageUrl:
                initial?.pageUrl ??
                (typeof window !== "undefined" ? window.location.href : ""),
            severity: initial?.severity ?? "medium",
            screenshots: [],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submitting = form.formState.isSubmitting;

    const onSubmit = async (values: FormValues) => {
        const fd = new FormData();
        if (values.email) fd.append("email", values.email);
        fd.append("description", values.description);
        if (values.steps) fd.append("steps", values.steps);
        if (values.pageUrl) fd.append("pageUrl", values.pageUrl);
        fd.append("severity", values.severity);

        const original = values.screenshots ?? [];
        const compressed: File[] = [];

        for (const f of original) {
            const useWebp = true;
            const out = await compressImageFile(f, {
                maxSize: 1600,
                format: useWebp ? "image/webp" : "image/jpeg",
                quality: 0.75,
                targetBytes: 500_000,
                minQuality: 0.5,
            });
            compressed.push(out);
        }

        compressed.forEach((f) => fd.append("screenshots", f, f.name));

        toast.promise(
            apiGateway.post("/support/report-bug", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            }),
            {
                loading: "Enviando bug…",
                success: "Bug enviado! Obrigado por ajudar 🙌",
                error: (e) => e?.message ?? "Falha ao enviar o bug.",
                finally: () => onOpenChange(false),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5" />
                        Reportar um bug
                    </DialogTitle>
                    <DialogDescription>
                        Anexe prints e descreva o problema.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="description">Descrição *</Label>
                        <Textarea
                            id="description"
                            rows={4}
                            placeholder="O que aconteceu? O que esperava que acontecesse?"
                            {...form.register("description")}
                            disabled={submitting}
                        />
                        {form.formState.errors.description && (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Passos */}
                    <div className="grid gap-2">
                        <Label htmlFor="steps">Passos para reproduzir (opcional)</Label>
                        <Textarea
                            id="steps"
                            rows={3}
                            placeholder="1) Acesse X  2) Clique em Y  3) Veja erro Z"
                            {...form.register("steps")}
                            disabled={submitting}
                        />
                    </div>

                    {/* URL / Severidade */}
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="pageUrl">URL da página</Label>
                            <Input id="pageUrl" {...form.register("pageUrl")} disabled={submitting} />
                            {form.formState.errors.pageUrl && (
                                <p className="text-xs text-destructive">
                                    {form.formState.errors.pageUrl.message}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Severidade</Label>
                            <Controller
                                name="severity"
                                control={form.control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={(v) => field.onChange(v)}
                                        disabled={submitting}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Baixa</SelectItem>
                                            <SelectItem value="medium">Média</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    {/* E-mail */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Seu e-mail (para retorno, opcional)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="voce@exemplo.com"
                            {...form.register("email")}
                            disabled={submitting}
                        />
                        {form.formState.errors.email && (
                            <p className="text-xs text-destructive">
                                {form.formState.errors.email.message as any}
                            </p>
                        )}
                    </div>

                    {/* Upload imagens */}
                    <div className="grid gap-2">
                        <Label>Capturas de tela (até 3, máx. 5MB cada)</Label>

                        <Controller
                            name="screenshots"
                            control={form.control}
                            render={({ field, fieldState }) => {
                                const fileInputRef = React.useRef<HTMLInputElement>(null);
                                const files: File[] = field.value ?? [];

                                const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
                                    const picked = Array.from(e.target.files ?? []);
                                    const next = [...files, ...picked].slice(0, 3);
                                    field.onChange(next);
                                    // permite escolher o mesmo arquivo de novo se precisar
                                    e.currentTarget.value = "";
                                };

                                const removeAt = (idx: number) => {
                                    const next = files.filter((_, i) => i !== idx);
                                    field.onChange(next);
                                };

                                return (
                                    <div className="space-y-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            disabled={submitting}
                                            onChange={onPick}
                                        />

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={submitting}
                                            >
                                                Selecionar imagens
                                            </Button>

                                            <span className="text-sm text-muted-foreground">
                                                {files.length ? `${files.length}/3 selecionadas` : "Nenhuma imagem selecionada"}
                                            </span>
                                        </div>

                                        {!!files.length && (
                                            <div className="flex flex-wrap gap-2">
                                                {files.map((f, i) => {
                                                    const url = URL.createObjectURL(f);
                                                    return (
                                                        <div key={i} className="relative">
                                                            <Image
                                                                src={url}
                                                                alt={f.name}
                                                                width={96}
                                                                height={96}
                                                                className="size-24 rounded border object-cover"
                                                                onLoad={() => URL.revokeObjectURL(url)}
                                                            />
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="secondary"
                                                                className="absolute -right-2 -top-2 h-6 w-6 rounded-full hover:opacity-80"
                                                                onClick={() => removeAt(i)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {fieldState.error && (
                                            <p className="text-xs text-destructive">
                                                {fieldState.error.message as any}
                                            </p>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            Enviar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

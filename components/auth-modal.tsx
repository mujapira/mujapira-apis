"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth/authContext";
import { apiGateway } from "@/lib/axios";

type Tab = "login" | "register";

type AuthModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "login" | "register";
};

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
    const [tab, setTab] = useState<Tab>(defaultTab);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>

            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {tab === "login" ? "Faça login" : "Crie sua conta"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                    <TabsList className="w-full">
                        <TabsTrigger value="login" className="w-full">
                            Login
                        </TabsTrigger>
                        <TabsTrigger value="register" className="w-full">
                            Cadastro
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="pt-4">
                        <LoginForm onSuccess={() => onOpenChange(false)} />
                    </TabsContent>

                    <TabsContent value="register" className="pt-4">
                        <RegisterForm onSuccess={() => onOpenChange(false)} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

interface FormProps {
    onSuccess: () => void;
}

interface LoginInputs {
    email: string;
    password: string;
}

function LoginForm({ onSuccess }: FormProps) {
    const { login } = useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<LoginInputs>();

    const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
        try {
            await login(data.email, data.password);
            onSuccess();
        } catch {
            setError("password", {
                type: "manual",
                message: "Credenciais inválidas",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                    id="login-email"
                    type="email"
                    {...register("email", { required: "Email é obrigatório" })}
                />
                {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                    id="login-password"
                    type="password"
                    {...register("password", { required: "Senha é obrigatória" })}
                />
                {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
            </div>

            <DialogFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
            </DialogFooter>
        </form>
    );
}

interface RegisterInputs {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
}

function RegisterForm({ onSuccess }: FormProps) {
    const { login } = useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<RegisterInputs>();

    const onSubmit: SubmitHandler<RegisterInputs> = async ({
        email,
        name,
        password,
        confirmPassword,
    }) => {
        if (password !== confirmPassword) {
            setError("confirmPassword", {
                type: "manual",
                message: "As senhas não conferem",
            });
            return;
        }

        try {
            await apiGateway.post("/users", {
                email,
                password,
                name,
                isAdmin: false,
            });
            // login automático
            await login(email, password);
            onSuccess();
        } catch {
            setError("email", {
                type: "manual",
                message: "Falha ao cadastrar usuário",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                    id="reg-email"
                    type="email"
                    {...register("email", {
                        required: "Email é obrigatório",
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: "Formato de email inválido",
                        },
                    })}
                />
                {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="reg-name">Nome</Label>
                <Input
                    id="reg-name"
                    type="text"
                    {...register("name", {
                        required: "Nome é obrigatório",
                        minLength: {
                            value: 2,
                            message: "Nome precisa ter ao menos 2 caracteres",
                        },
                    })}
                />
                {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="reg-password">Senha</Label>
                <Input
                    id="reg-password"
                    type="password"
                    {...register("password", {
                        required: "Senha é obrigatória",
                        minLength: {
                            value: 6,
                            message: "Senha precisa ter ao menos 6 caracteres",
                        },
                    })}
                />
                {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="reg-confirm">Confirmar Senha</Label>
                <Input
                    id="reg-confirm"
                    type="password"
                    {...register("confirmPassword", {
                        required: "Confirmação de senha é obrigatória",
                    })}
                />
                {errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                        {errors.confirmPassword.message}
                    </p>
                )}
            </div>

            <DialogFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Cadastrando..." : "Cadastrar"}
                </Button>
            </DialogFooter>
        </form>
    );
}

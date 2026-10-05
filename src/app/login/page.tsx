import { buttonVariants } from "@/components/ui/button";

const GENERIC_ERROR = "Đăng nhập không thành công. Vui lòng thử lại.";

// Only these fixed strings are ever rendered; the query value itself is not.
const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: "Chỉ email công ty mới đăng nhập được.",
  login_failed: GENERIC_ERROR,
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? GENERIC_ERROR) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-soft px-4">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-[28px] leading-tight font-semibold">ssMarket</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sàn mua bán nội bộ dành cho nhân viên.
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        {/* A plain link, not next/link: this must be a full navigation that
            reaches the backend through the /api proxy. */}
        <a
          href="/api/auth/google"
          className={buttonVariants({ size: "lg", className: "mt-6 w-full" })}
        >
          Đăng nhập với Google
        </a>
      </section>
    </main>
  );
}
